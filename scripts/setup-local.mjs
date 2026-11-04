import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";

const command=process.platform==="win32"?"cmd.exe":"npx";
const args=process.platform==="win32"?["/d","/s","/c","npx --yes supabase@3.0.0 status -o json"]:["--yes","supabase@3.0.0","status","-o","json"];
const state=JSON.parse(execFileSync(command,args,{encoding:"utf8",stdio:["ignore","pipe","pipe"]}));
if(!["127.0.0.1","localhost","[::1]"].includes(new URL(state.API_URL).hostname)) throw new Error("Only local Supabase is supported by this setup.");
for(const key of ["API_URL","ANON_KEY","SERVICE_ROLE_KEY"]) if(!state[key]) throw new Error("Local Supabase credentials unavailable.");
const env={NEXT_PUBLIC_SUPABASE_URL:state.API_URL,NEXT_PUBLIC_SUPABASE_ANON_KEY:state.ANON_KEY,SUPABASE_SERVICE_ROLE_KEY:state.SERVICE_ROLE_KEY,NEXT_PUBLIC_SITE_URL:"http://127.0.0.1:3100",NEXT_PUBLIC_APP_ENV:"prototype",CRON_SECRET:randomBytes(32).toString("hex"),WORKER_BASE_URL:"http://127.0.0.1:3100",INVOFIN_OCR_MODE:"manual"};
writeFileSync(".env.test.local",Object.entries(env).map(([key,value])=>`${key}=${value}`).join("\n")+"\n",{mode:0o600});
console.log("Saved ignored .env.test.local for local integration testing. Existing .env.local was preserved. Restart local app and worker if already running.");
