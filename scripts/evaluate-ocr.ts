import { readFile, realpath } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { parseDataset } from "../lib/documents/dataset";
import { AzureDocumentIntelligenceProvider } from "../lib/documents/azure";
import { evaluateExtraction } from "../lib/documents/evaluate";

async function main() {
  if(!process.argv.includes("--live")) throw new Error("Use --live explicitly: this command sends labeled documents to configured Azure and may incur API usage.");
  const manifestFlag=process.argv.indexOf("--manifest");
  const manifestFile=manifestFlag>=0?process.argv[manifestFlag+1]:"evaluation/ocr.synthetic.json";
  const manifest=parseDataset(JSON.parse(await readFile(manifestFile,"utf8")));
  const flag=(name:string)=>{const i=process.argv.indexOf(name);return i>=0?process.argv[i+1]:undefined;};
  const limit=Number(flag("--limit")??6);
  if(!Number.isInteger(limit)||limit<1||limit>100) throw new Error("Use --limit between 1 and 100; default is 6 API calls.");
  const selected=manifest.cases.filter(item=>(!flag("--split")||item.split===flag("--split"))&&(!flag("--type")||item.documentType===flag("--type"))).slice(0,limit);
  if(!selected.length) throw new Error("No cases match the selected split/type.");
  const provider=new AzureDocumentIntelligenceProvider();
  if(!provider.isConfigured()) throw new Error("Azure is not configured.");
  const aggregate: Record<string,{correct:number;total:number;missing:number}>={};
  let failed=0,manualReview=0;const latencies:number[]=[];
  for(const item of selected) {
    const location=await realpath(item.file);const relative=path.relative(await realpath(process.cwd()),location);
    if(relative.startsWith("..")||path.isAbsolute(relative)) throw new Error("Dataset files must stay within the project.");
    const bytes=await readFile(location);
    if(item.sha256 && createHash("sha256").update(bytes).digest("hex")!==item.sha256) throw new Error("Dataset checksum mismatch.");
    const started=performance.now();
    const result=await provider.extractInvoice({bytes:bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),mimeType:item.mimeType,filename:path.basename(location)});
    if(result.status==="failed") failed++;
    latencies.push(performance.now()-started);
    if(result.status!=="completed") manualReview++;
    for(const [field,score] of Object.entries(evaluateExtraction(item.expected,result.fields))) {
      const total=aggregate[field]??={correct:0,total:0,missing:0};
      total.correct+=score.correct;total.total+=score.total;total.missing+=score.missing;
    }
  }
  // Aggregate-only report: no raw invoice text, names, keys or signed URLs.
  latencies.sort((a,b)=>a-b);
  console.log(JSON.stringify({schemaVersion:2,datasetVersion:manifest.datasetVersion,datasetKind:manifest.datasetKind,provider:provider.name,cases:selected.length,failed,manualReview,latencyMs:{p50:latencies[Math.ceil(latencies.length*.5)-1],p95:latencies[Math.ceil(latencies.length*.95)-1]},fields:Object.fromEntries(Object.entries(aggregate).map(([key,value])=>[key,{...value,accuracy:value.correct/value.total}]))},null,2));
  if(failed) process.exitCode=1;
}
main().catch(error=>{console.error(error instanceof Error?error.message:"Evaluation failed.");process.exitCode=1;});
