import { loadEnvFile } from "node:process";
import { spawn } from "node:child_process";
loadEnvFile(".env.test.local");
if(!["127.0.0.1","localhost","[::1]"].includes(new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname)) throw new Error("Local runner refuses cloud database credentials.");
const worker=process.argv.includes("--worker");
const args=worker?["scripts/run-document-worker.mjs"]:["node_modules/next/dist/bin/next","dev","--hostname","127.0.0.1","--port","3100"];
const child=spawn(process.execPath,args,{stdio:"inherit",env:process.env});
process.on("SIGINT",()=>child.kill("SIGINT"));process.on("SIGTERM",()=>child.kill("SIGTERM"));
child.on("exit",code=>{process.exitCode=code??0;});
