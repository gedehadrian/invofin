import { readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

async function main() {
  if(!process.argv.includes("--apply")) throw new Error("Use --apply explicitly to configure the established InvoFin cloud project.");
  const env=parseEnv(readFileSync(".env.local","utf8"));
  const project=JSON.parse(readFileSync(".vercel/project.json","utf8"));
  if(project.projectName!=="invofin" || new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname!=="skwwgjjgeativyevkkpl.supabase.co") throw new Error("Cloud target does not match InvoFin.");
  const secret=randomBytes(32).toString("hex");
  const vars={NEXT_PUBLIC_SUPABASE_URL:env.NEXT_PUBLIC_SUPABASE_URL,NEXT_PUBLIC_SUPABASE_ANON_KEY:env.NEXT_PUBLIC_SUPABASE_ANON_KEY,NEXT_PUBLIC_SITE_URL:"https://invofin-gede-hadrians-projects.vercel.app",NEXT_PUBLIC_APP_ENV:"prototype",SUPABASE_SERVICE_ROLE_KEY:env.SUPABASE_SERVICE_ROLE_KEY,AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT:env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT,AZURE_DOCUMENT_INTELLIGENCE_KEY:env.AZURE_DOCUMENT_INTELLIGENCE_KEY,CRON_SECRET:secret,INVOFIN_OCR_MODE:"azure"};
  vars.INVOFIN_DEPLOYMENT_ENV="staging";
  const added=new Set(["NEXT_PUBLIC_APP_ENV","CRON_SECRET","INVOFIN_OCR_MODE","INVOFIN_DEPLOYMENT_ENV"]);
  for(const [key,value] of Object.entries(vars)) {
    if(!value) throw new Error(`Missing required configuration: ${key}`);
    const type=key.startsWith("NEXT_PUBLIC_")||key.startsWith("INVOFIN_")?"config":"secret";
    const update=["--yes","vercel@65.11.0","env","update",key,"--environment","production","--yes","--type",type];
    const add=["--yes","vercel@65.11.0","env","add",key,"--environment","production","--yes","--type",type];
    const run=args=>process.platform==="win32"?spawnSync("cmd.exe",["/d","/s","/c",["npx",...args].join(" ")],{input:value,encoding:"utf8",windowsHide:true}):spawnSync("npx",args,{input:value,encoding:"utf8"});
    // Updates are safe on a repeat run; additions are attempted only for the three new keys.
    let result=run(update);
    if(result.status!==0 && added.has(key)) result=run(add);
    if(result.status!==0) throw new Error(`Vercel configuration failed for ${key}; no value was logged.`);
    console.log(`Configured ${key}`);
  }
  const db=createClient(env.NEXT_PUBLIC_SUPABASE_URL,env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
  const {error}=await db.rpc("configure_document_worker",{p_endpoint:"https://invofin-gede-hadrians-projects.vercel.app/api/internal/document-jobs",p_secret:secret});
  if(error) throw new Error("Worker token is set in Vercel but Vault configuration failed; rerun after applying cloud migration.");
  console.log("Worker token stored in Supabase Vault. Deploy the new application to activate it.");
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
