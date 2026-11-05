import assert from "node:assert/strict";
import {test} from "node:test";
import {threeWayFindings} from "./three-way";
import {runDocumentConsistencyRules} from "./rules-engine";
const fields={invoiceNumber:"INV-1",invoiceReference:"INV-1",purchaseOrder:"PO-1",items:[{description:"Barang A",quantity:5,unitPrice:10000,amount:50000,confidence:.99}]};
test("three-way matching checks references, quantities and price with conservative missing-data handling",()=>{
  assert.deepEqual(threeWayFindings(fields,fields,fields),[]);
  assert.ok(threeWayFindings(fields,{...fields,purchaseOrder:"PO-2"},fields).includes("REFERENCE_MISMATCH"));
  assert.ok(threeWayFindings(fields,fields,{...fields,items:[{...fields.items[0],quantity:6}]}).includes("ITEMS_MISMATCH"));
  assert.ok(threeWayFindings(fields,fields,{...fields,items:[{...fields.items[0],amount:50001}]}).includes("ITEMS_MISMATCH"));
  assert.ok(threeWayFindings(fields,{...fields,items:[]},fields).includes("SUPPORTING_DATA_INCOMPLETE"));
});
test("small monetary inflation is not hidden by percentage tolerance",()=>{
  const findings=runDocumentConsistencyRules({invoice:{invoiceNumber:"INV-1",amount:50001,issueDate:"2026-11-01",dueDate:"2026-12-16",requestedAdvancePercent:80,buyerStatus:"active",duplicateInvoiceHash:false,duplicateSupportingHash:false},documents:[{documentType:"invoice",sha256:"x",extractionStatus:"completed",extracted:{...fields,amount:50000}}],vendorHistoricalAmounts:[]});
  assert.ok(findings.some(x=>x.code==="AMOUNT_MISMATCH"));
});
