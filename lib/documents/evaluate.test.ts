import { test } from "node:test";
import assert from "node:assert/strict";
import { evaluateExtraction } from "./evaluate";

test("OCR evaluation compares independent labels and counts missing fields as errors",()=>{
  const result=evaluateExtraction({invoiceNumber:"INV-001",amount:25000000,buyerName:"PT Buyer"},{invoiceNumber:" inv-001 ",amount:250000,buyerName:null,confidence:1});
  assert.equal(result.invoiceNumber.correct,1);
  assert.equal(result.amount.correct,0);
  assert.deepEqual(result.buyerName,{correct:0,total:1,missing:1});
});
test("OCR evaluation preserves meaningful invoice punctuation",()=>{
  assert.equal(evaluateExtraction({invoiceNumber:"INV-001"},{invoiceNumber:"INV001"}).invoiceNumber.correct,0);
});
