import {normalizeAzureFields,normalizeAmount,type AzureField} from "./normalize";
type Pair={key?:{content?:string};value?:{content?:string};confidence?:number};
type Table={rowCount:number;columnCount:number;cells:{rowIndex:number;columnIndex:number;content:string}[]};
export type LayoutResult={keyValuePairs?:Pair[];tables?:Table[];pages?:{words?:{confidence?:number}[]}[]};
const key=(value:string)=>value.toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
const aliases:Record<string,string[]>={InvoiceId:["invoice number","nomor invoice","no invoice"],PurchaseOrder:["purchase order","nomor po","po number"],VendorName:["vendor","supplier","vendor supplier","nama vendor","pemasok"],CustomerName:["buyer","bill to","buyer bill to","nama buyer"],InvoiceDate:["issue date","tanggal terbit","tanggal serah terima"],DueDate:["due date","jatuh tempo","tanggal jatuh tempo"],InvoiceTotal:["total","grand total","nominal","jumlah tagihan"]};
export function normalizeLayout(result:LayoutResult) {
  const fields:Record<string,AzureField>={};
  for(const pair of result.keyValuePairs??[]) for(const [name,keys] of Object.entries(aliases)) if(keys.includes(key(pair.key?.content??""))&&!fields[name]) fields[name]={content:pair.value?.content,confidence:pair.confidence};
  const normalized=normalizeAzureFields(fields);
  normalized.fields.invoiceReference=normalized.fields.invoiceNumber;
  const words=(result.pages??[]).flatMap(page=>(page.words??[]).map(word=>typeof word.confidence==="number"&&Number.isFinite(word.confidence)&&word.confidence>=0&&word.confidence<=1?word.confidence:0));
  const confidence=words.length?Math.min(...words):0;
  const items=[];
  for(const table of result.tables??[]) {
    const headers=new Map(table.cells.filter(x=>x.rowIndex===0).map(cell=>[key(cell.content),cell.columnIndex]));
    const description=["description","keterangan","item","barang"].map(x=>headers.get(x)).find(x=>x!==undefined);
    const quantity=["qty","quantity","kuantitas","jumlah"].map(x=>headers.get(x)).find(x=>x!==undefined);
    const column=(prefixes:string[])=>[...headers].find(([name])=>prefixes.some(prefix=>name===prefix||name.startsWith(prefix+" ")))?.[1];
    const unitPrice=column(["unit price","harga satuan"]),amount=column(["amount","total","nilai"]);
    if(description===undefined||quantity===undefined) continue;
    for(let row=1;row<table.rowCount;row++) {const cells=table.cells.filter(x=>x.rowIndex===row);const value=(col:number|undefined)=>col===undefined?null:normalizeAmount(cells.find(x=>x.columnIndex===col)?.content);items.push({description:cells.find(x=>x.columnIndex===description)?.content??"",quantity:value(quantity),unitPrice:value(unitPrice),amount:value(amount),confidence});}
  }
  normalized.fields.items=items;
  if(!items.length||confidence<.85) normalized.reviewReasons.push("SUPPORTING_ITEMS_REQUIRE_REVIEW");
  return normalized;
}
