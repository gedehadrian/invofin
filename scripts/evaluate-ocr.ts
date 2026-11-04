import { readFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { AzureDocumentIntelligenceProvider } from "../lib/documents/azure";
import { evaluateExtraction } from "../lib/documents/evaluate";

async function main() {
  if(!process.argv.includes("--live")) throw new Error("Use --live explicitly: this command sends labeled documents to configured Azure and may incur API usage.");
  const manifestFlag=process.argv.indexOf("--manifest");
  const manifestFile=manifestFlag>=0?process.argv[manifestFlag+1]:"evaluation/ocr.synthetic.json";
  const labels=z.object({invoiceNumber:z.string(),buyerName:z.string(),vendorName:z.string(),amount:z.number().positive(),issueDate:z.string(),dueDate:z.string()});
  const schema=z.object({schemaVersion:z.literal(1),datasetKind:z.enum(["synthetic","representative"]),cases:z.array(z.object({id:z.string(),file:z.string(),mimeType:z.enum(["application/pdf","image/jpeg","image/png"]),expected:labels})).min(1).max(100)});
  const manifest=schema.parse(JSON.parse(await readFile(manifestFile,"utf8")));
  const provider=new AzureDocumentIntelligenceProvider();
  if(!provider.isConfigured()) throw new Error("Azure is not configured.");
  const aggregate: Record<string,{correct:number;total:number;missing:number}>={};
  let failed=0,manualReview=0;
  for(const item of manifest.cases) {
    const location=path.resolve(item.file);const relative=path.relative(process.cwd(),location);
    if(relative.startsWith("..")||path.isAbsolute(relative)) throw new Error("Dataset files must stay within the project.");
    const bytes=await readFile(location);
    const result=await provider.extractInvoice({bytes:bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),mimeType:item.mimeType,filename:path.basename(location)});
    if(result.status==="failed") failed++;
    if(result.status!=="completed") manualReview++;
    for(const [field,score] of Object.entries(evaluateExtraction(item.expected,result.fields))) {
      const total=aggregate[field]??={correct:0,total:0,missing:0};
      total.correct+=score.correct;total.total+=score.total;total.missing+=score.missing;
    }
  }
  // Aggregate-only report: no raw invoice text, names, keys or signed URLs.
  console.log(JSON.stringify({schemaVersion:1,datasetKind:manifest.datasetKind,provider:provider.name,cases:manifest.cases.length,failed,manualReview,fields:Object.fromEntries(Object.entries(aggregate).map(([key,value])=>[key,{...value,accuracy:value.correct/value.total}]))},null,2));
  if(failed) process.exitCode=1;
}
main().catch(error=>{console.error(error instanceof Error?error.message:"Evaluation failed.");process.exitCode=1;});
