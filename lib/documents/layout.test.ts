import assert from "node:assert/strict";
import {test} from "node:test";
import {normalizeLayout} from "./layout";
test("BAST layout extracts labeled references and table items without inventing confidence",()=>{
  const labels={"Invoice number":"INV-1","Purchase order":"PO-1","Vendor / Supplier":"Vendor A","Buyer / Bill to":"Buyer B","Issue date":"2026-11-01","Due date":"2026-12-16","Total":"IDR 50,000.00"};
  const source={keyValuePairs:Object.entries(labels).map(([key,value])=>({key:{content:key},value:{content:value},confidence:.99})),pages:[{words:[{confidence:.99}]}],tables:[{rowCount:2,columnCount:4,cells:["Description","Qty","Unit price (IDR)","Amount (IDR)","Barang A","5","10,000.00","50,000.00"].map((content,i)=>({rowIndex:i<4?0:1,columnIndex:i%4,content}))}]};
  const result=normalizeLayout(source);assert.equal(result.fields.invoiceReference,"INV-1");assert.equal(result.fields.items?.[0].quantity,5);assert.equal(result.reviewReasons.length,0);
  assert.ok(normalizeLayout({...source,pages:[]}).reviewReasons.includes("SUPPORTING_ITEMS_REQUIRE_REVIEW"));
});
