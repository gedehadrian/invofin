import { test } from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "../lib/database.types";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const base = process.env.WORKER_BASE_URL || "http://127.0.0.1:3100";
for (const value of [url,base]) assert.ok(["127.0.0.1","localhost","[::1]"].includes(new URL(value).hostname), "Auth integration tests require loopback services.");
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const admin = createClient<Database>(url,process.env.SUPABASE_SERVICE_ROLE_KEY!,{auth:{persistSession:false,autoRefreshToken:false}});

test("local Auth onboarding, account state and recovery callbacks", {timeout:90000}, async t=>{
  const email = `round1.${crypto.randomUUID()}@invofin.test`, password = "RoundOne!Integration2026", changedPassword = "RoundOne!Recovered2026";
  const created = await admin.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{full_name:"Round One Test",synthetic:true}});
  assert.ifError(created.error);const user = created.data.user!;
  const jar = new Map<string,string>();
  const client = createServerClient<Database>(url,anon,{cookies:{getAll:()=>[...jar].map(([name,value])=>({name,value})),setAll:items=>{for(const item of items) jar.set(item.name,item.value);}}});
  assert.ifError((await client.auth.signInWithPassword({email,password})).error);
  const cookieHeader = ()=>[...jar].map(([name,value])=>`${name}=${value}`).join("; ");
  function readCookies(response:Response) {
    for(const raw of response.headers.getSetCookie()) {const pair=raw.split(";",1)[0], split=pair.indexOf("=");jar.set(pair.slice(0,split),pair.slice(split+1));}
  }
  await t.test("unaffiliated identity resumes onboarding and public clients cannot enroll",async()=>{
    const signup=createClient<Database>(url,anon,{auth:{persistSession:false,autoRefreshToken:false}});
    const registered=await signup.auth.signUp({email:`signup.${crypto.randomUUID()}@invofin.test`,password});
    assert.ifError(registered.error);assert.ok(registered.data.user);
    assert.equal((await admin.from("organization_members").select("id").eq("user_id",registered.data.user!.id)).data?.length,0);
    const response=await fetch(`${base}/onboarding`,{headers:{Cookie:cookieHeader()}});
    assert.equal(response.status,200);assert.ok((await response.text()).includes("Lengkapi organisasi Anda"));
    const args={p_actor:user.id,p_full_name:"Round One Test",p_organization_name:`Test Round One ${user.id.slice(0,8)}`,p_type:"vendor",p_sector:"Sintetis"};
    assert.ok((await client.rpc("complete_onboarding",args)).error);
    const results=await Promise.all([admin.rpc("complete_onboarding",args),admin.rpc("complete_onboarding",args)]);
    results.forEach(result=>assert.ifError(result.error));assert.equal(results[0].data,results[1].data);
    assert.equal((await admin.from("organization_members").select("id").eq("user_id",user.id)).data?.length,1);
  });
  const membership=(await admin.from("organization_members").select("organization_id").eq("user_id",user.id).single()).data!;
  await t.test("pending and suspended organizations see account status; active membership resumes workspace",async()=>{
    for(const [status,label] of [["pending","Organisasi menunggu persetujuan"],["suspended","Akses organisasi ditangguhkan"]] as const) {
      assert.ifError((await admin.from("organizations").update({status}).eq("id",membership.organization_id)).error);
      const page=await fetch(`${base}/account-status`,{headers:{Cookie:cookieHeader()}});
      assert.equal(page.status,200);assert.ok((await page.text()).includes(label));
      const workspace=await fetch(`${base}/app/vendor`,{headers:{Cookie:cookieHeader()},redirect:"manual"});
      const body=await workspace.text();
      assert.ok(workspace.headers.get("location")?.endsWith("/account-status") || body.includes("/account-status"));
    }
    assert.ifError((await admin.from("organizations").update({status:"active"}).eq("id",membership.organization_id)).error);
    const page=await fetch(`${base}/account-status`,{headers:{Cookie:cookieHeader()},redirect:"manual"});
    const body=await page.text();assert.ok(page.headers.get("location")?.endsWith("/app/vendor") || body.includes("/app/vendor"));
  });
  await t.test("actual local recovery email returns through the PKCE callback",async()=>{
    assert.ifError((await client.auth.resetPasswordForEmail(email,{redirectTo:`${base}/auth/callback?next=/reset-password`})).error);
    let messageId: string | undefined;
    for(let attempt=0;attempt<10;attempt++) {
      const mailbox=await (await fetch("http://127.0.0.1:54324/api/v1/messages")).json();
      messageId=mailbox.messages?.find((message:{To?:{Address:string}[]})=>message.To?.some(to=>to.Address===email))?.ID;
      if(messageId) break;
      await new Promise(resolve=>setTimeout(resolve,200));
    }
    assert.ok(messageId,"Recovery email should arrive in local Mailpit.");
    const message=await (await fetch(`http://127.0.0.1:54324/api/v1/message/${messageId}`)).json();
    const hrefs=[...String(message.HTML).matchAll(/href=["']([^"']+)["']/g)].map(match=>match[1].replaceAll("&amp;","&"));
    const verificationUrl=hrefs.find(href=>href.includes("/auth/v1/verify"));assert.ok(verificationUrl);
    assert.ok(["127.0.0.1","localhost"].includes(new URL(verificationUrl).hostname));
    const verified=await fetch(verificationUrl,{redirect:"manual"});
    const callback=new URL(verified.headers.get("location")!);assert.equal(callback.origin,new URL(base).origin);
    for(const key of jar.keys()) if(!key.includes("code-verifier")) jar.delete(key);
    const response=await fetch(callback,{headers:{Cookie:cookieHeader()},redirect:"manual"});readCookies(response);
    assert.equal(new URL(response.headers.get("location")!).pathname,"/reset-password");
    assert.equal((await client.auth.getUser()).data.user?.id,user.id);
  });
  await t.test("recovery token creates SSR session, password changes, old password and token are rejected",async()=>{
    const link=await admin.auth.admin.generateLink({type:"recovery",email});assert.ifError(link.error);
    jar.clear();
    const location = `${base}/auth/confirm?type=recovery&token_hash=${encodeURIComponent(link.data.properties.hashed_token)}`;
    const response=await fetch(location,{redirect:"manual"});readCookies(response);
    assert.equal(new URL(response.headers.get("location")!).pathname,"/reset-password");
    assert.equal((await client.auth.getUser()).data.user?.id,user.id);
    const page=await fetch(`${base}/reset-password`,{headers:{Cookie:cookieHeader()}});
    assert.ok((await page.text()).includes("Buat kata sandi baru"));
    assert.ifError((await client.auth.updateUser({password:changedPassword})).error);
    assert.ifError((await client.auth.signOut({scope:"global"})).error);
    const login=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}});
    assert.ok((await login.auth.signInWithPassword({email,password})).error);
    assert.ifError((await login.auth.signInWithPassword({email,password:changedPassword})).error);
    const expired=await fetch(location,{redirect:"manual"});
    assert.equal(new URL(expired.headers.get("location")!).pathname,"/forgot-password");
  });
  await t.test("missing recovery session and invalid callback do not enter the workspace",async()=>{
    const page=await fetch(`${base}/reset-password`);assert.ok((await page.text()).includes("Tautan pemulihan diperlukan"));
    const callback=await fetch(`${base}/auth/callback?next=/reset-password`,{redirect:"manual"});
    assert.equal(new URL(callback.headers.get("location")!).pathname,"/forgot-password");
  });
});
