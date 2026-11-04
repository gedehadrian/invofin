const secret=process.env.CRON_SECRET;
if (!secret || secret.length<32) throw new Error("Set CRON_SECRET (at least 32 characters).");
const base=new URL(process.env.WORKER_BASE_URL ?? "http://127.0.0.1:3100");
if (base.protocol!=="https:" && !["localhost","127.0.0.1","[::1]"].includes(base.hostname)) throw new Error("Remote worker endpoints require HTTPS.");
const endpoint=new URL("/api/internal/document-jobs",base);
let stopped=false;
process.on("SIGINT",()=>{stopped=true;});process.on("SIGTERM",()=>{stopped=true;});
do {
  try {
    const response=await fetch(endpoint,{ method:"POST",headers:{Authorization:`Bearer ${secret}`},signal:AbortSignal.timeout(65000)});
    console.log(JSON.stringify({time:new Date().toISOString(),status:response.status,...(response.ok ? await response.json() : {error:"WORKER_REQUEST_FAILED"})}));
    if (!response.ok && process.argv.includes("--once")) process.exitCode=1;
  } catch { console.error("Worker unavailable; next attempt in five seconds."); if(process.argv.includes("--once")) process.exitCode=1; }
  if(process.argv.includes("--once") || stopped) break;
  await new Promise(resolve=>setTimeout(resolve,5000));
} while(!stopped);
