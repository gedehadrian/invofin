import {test} from "node:test";
import assert from "node:assert/strict";
import {execFileSync} from "node:child_process";
import {createClient} from "@supabase/supabase-js";
import type {Database} from "../lib/database.types";
import {uploadPaths} from "../lib/documents/upload-contract";

const url=process.env.NEXT_PUBLIC_SUPABASE_URL!;
if(!["127.0.0.1","localhost","[::1]"].includes(new URL(url).hostname)) throw new Error("Operations tests require local Supabase.");
const db=createClient<Database>(url,process.env.SUPABASE_SERVICE_ROLE_KEY!,{auth:{persistSession:false,autoRefreshToken:false}});

test("atomic upload quota and quarantine retention on real local services",{timeout:60000},async t=>{
 const suffix=crypto.randomUUID();
 const user=await db.auth.admin.createUser({email:`ops.${suffix}@invofin.test`,password:"LocalOperations!2026",email_confirm:true});
 assert.ifError(user.error);const actor=user.data.user!.id;
 const org=await db.from("organizations").insert({name:`Ops ${suffix}`,type:"vendor",status:"active"}).select("id").single();
 assert.ifError(org.error);const vendor=org.data!.id;
 assert.ifError((await db.from("organization_members").insert({organization_id:vendor,user_id:actor,role:"vendor",is_primary:true})).error);
 const buyer=await db.from("organizations").insert({name:`Ops Buyer ${suffix}`,type:"buyer",status:"active"}).select("id").single();
 assert.ifError(buyer.error);
 const invoice=await db.from("invoices").insert({vendor_org_id:vendor,buyer_org_id:buyer.data!.id,invoice_number:`OPS-${suffix}`,amount:1000,issue_date:"2026-11-01",due_date:"2099-12-01",created_by:actor}).select("id").single();
 assert.ifError(invoice.error);const invoiceId=invoice.data!.id;
 await t.test("35 simultaneous reservations accept exactly 30 and reject foreign paths",async()=>{
  const args=()=>{const id=crypto.randomUUID(),paths=uploadPaths(vendor,invoiceId,id,"invoice.pdf");return {p_actor:actor,p_upload:{id,invoice_id:invoiceId,vendor_org_id:vendor,document_type:"invoice",original_filename:"invoice.pdf",mime_type:"application/pdf",size_bytes:100,storage_path:paths.quarantine,final_path:paths.verified}};};
  const invalid=args();invalid.p_upload.storage_path="foreign/path";
  assert.ok((await db.rpc("reserve_document_upload",invalid)).error);
  const results=await Promise.all(Array.from({length:35},()=>db.rpc("reserve_document_upload",args())));
  assert.equal(results.filter(x=>!x.error).length,30);
  assert.equal(results.filter(x=>x.error?.message.includes("UPLOAD_RATE_LIMIT")).length,5);
 });
 await t.test("dry run preserves bytes, apply cleans quarantine once and keeps canonical evidence",async()=>{
  const uploadId=crypto.randomUUID(),paths=uploadPaths(vendor,invoiceId,uploadId,"expired.pdf");
  const bytes=Buffer.from("%PDF-1.4\n%local synthetic retention fixture\n");
  assert.ifError((await db.storage.from("invoice-uploads").upload(paths.quarantine,bytes,{contentType:"application/pdf"})).error);
  assert.ifError((await db.storage.from("invoice-documents").upload(paths.verified,bytes,{contentType:"application/pdf"})).error);
  assert.ifError((await db.from("document_uploads").insert({id:uploadId,invoice_id:invoiceId,vendor_org_id:vendor,uploaded_by:actor,document_type:"invoice",original_filename:"expired.pdf",mime_type:"application/pdf",size_bytes:bytes.length,storage_path:paths.quarantine,final_path:paths.verified,expires_at:new Date(Date.now()-48*3600000).toISOString()})).error);
  const run=(apply:boolean)=>JSON.parse(execFileSync(process.execPath,["--env-file=.env.test.local","node_modules/tsx/dist/cli.mjs","scripts/storage-retention.ts",...(apply?["--apply"]:[])],{encoding:"utf8",windowsHide:true}));
  assert.equal(run(false).dryRun,true);
  assert.ifError((await db.storage.from("invoice-uploads").download(paths.quarantine)).error);
  assert.equal(run(true).dryRun,false);
  assert.ok((await db.storage.from("invoice-uploads").download(paths.quarantine)).error);
  assert.ifError((await db.storage.from("invoice-documents").download(paths.verified)).error);
  assert.ok((await db.from("document_uploads").select("quarantine_purged_at").eq("id",uploadId).single()).data?.quarantine_purged_at);
  assert.equal(run(true).removed,0);
 });
});
