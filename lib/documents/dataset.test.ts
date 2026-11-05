import assert from "node:assert/strict";
import {test} from "node:test";
import {parseDataset} from "./dataset";
test("augmented descendants and template families cannot leak between dataset splits",()=>{
  const row={id:"a",sourceId:"source-a",familyId:"template-a",split:"train",file:"a.png",sha256:"a".repeat(64),mimeType:"image/png",expected:{amount:100}};
  const manifest={schemaVersion:2,datasetKind:"synthetic",cases:[row,{...row,id:"b"}]};
  assert.equal(parseDataset(manifest).cases.length,2);
  assert.throws(()=>parseDataset({...manifest,cases:[row,{...row,id:"b",split:"test"}]}),/leakage/);
  assert.throws(()=>parseDataset({...manifest,cases:[row,{...row,id:"b",sourceId:"source-b",split:"test"}]}),/leakage/);
  assert.throws(()=>parseDataset({...manifest,cases:[row,row]}),/Duplicate/);
});
