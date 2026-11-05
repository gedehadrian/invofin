import {readFile} from "node:fs/promises";
import {parseDataset} from "../lib/documents/dataset";
import {threeWayFindings} from "../lib/risk/three-way";

async function main() {
const flag=process.argv.indexOf("--manifest"),filename=flag>=0?process.argv[flag+1]:"evaluation/generated/documents-v1/manifest.json";
const manifest=parseDataset(JSON.parse(await readFile(filename,"utf8")));
const groups=new Map<string,typeof manifest.cases>();
for(const row of manifest.cases.filter(x=>x.augmentation?.name==="pdf")) {const key=row.sourceId!;groups.set(key,[...(groups.get(key)??[]),row]);}
const confusion={trueReview:0,falseReview:0,missedReview:0,trueConsistent:0};
for(const group of groups.values()) {
  const fields=(type:string)=>{const expected=group.find(x=>x.documentType===type)?.expected;if(!expected)throw new Error("Incomplete document triple");return {...expected,invoiceReference:type==="bast"?expected.invoiceNumber:undefined,items:expected.items?.map(item=>({...item,confidence:1}))};};
  const review=threeWayFindings(fields("invoice"),fields("purchase_order"),fields("bast")).length>0,expected=group[0].screeningExpected;
  if(!expected)throw new Error("Independent screening label required");
  confusion[review?(expected==="review"?"trueReview":"falseReview"):(expected==="review"?"missedReview":"trueConsistent")]++;
}
console.log(JSON.stringify({datasetKind:manifest.datasetKind,datasetVersion:manifest.datasetVersion,groups:groups.size,usesOracleFields:true,measures:"Rule behavior on labeled fields; does not measure OCR or real fraud detection",confusion},null,2));
}
main().catch(()=>{console.error("Screening evaluation failed; verify the manifest and independent labels.");process.exitCode=1;});
