import type { ExtractedFields } from "./rules-engine";
const reference=(value:string)=>value.normalize("NFKC").replace(/\s+/g,"").toUpperCase();
function itemSignature(items:ExtractedFields["items"]) {
  if(!items?.length||items.some(x=>!x.description.trim()||x.quantity==null||!Number.isFinite(x.quantity)||x.quantity<=0||!Number.isFinite(x.confidence)||(x.confidence??0)<.85)) return null;
  const grouped=new Map<string,{quantity:number;amount:number}>();
  for(const item of items) {
    const amount=item.amount??(item.unitPrice==null?null:item.unitPrice*item.quantity!);
    if(amount==null||!Number.isFinite(amount)||amount<=0) return null;
    const key=item.description.normalize("NFKC").trim().replace(/\s+/g," ").toUpperCase(),prior=grouped.get(key)??{quantity:0,amount:0};
    grouped.set(key,{quantity:prior.quantity+item.quantity!,amount:prior.amount+amount});
  }
  return [...grouped].sort(([a],[b])=>a.localeCompare(b)).map(([key,value])=>[key,Number(value.quantity.toFixed(6)),Math.round(value.amount*100)]);
}
export function threeWayFindings(invoice?:ExtractedFields|null,po?:ExtractedFields|null,bast?:ExtractedFields|null) {
  const codes=new Set<"REFERENCE_MISMATCH"|"ITEMS_MISMATCH"|"SUPPORTING_DATA_INCOMPLETE">();
  const expected=invoice?.purchaseOrder,poRef=po?.purchaseOrder??po?.documentNumber,bastRef=bast?.purchaseOrder;
  if(!expected||!poRef||!bastRef) codes.add("SUPPORTING_DATA_INCOMPLETE");
  if(expected&&poRef&&reference(expected)!==reference(poRef)) codes.add("REFERENCE_MISMATCH");
  if(expected&&bastRef&&reference(expected)!==reference(bastRef)) codes.add("REFERENCE_MISMATCH");
  if(invoice?.invoiceNumber&&bast?.invoiceReference&&reference(invoice.invoiceNumber)!==reference(bast.invoiceReference)) codes.add("REFERENCE_MISMATCH");
  const signatures=[invoice,po,bast].map(x=>itemSignature(x?.items));
  for(const doc of [invoice,po,bast]) if(doc?.items?.some(item=>(item.confidence??0)>=.85&&item.quantity!=null&&item.unitPrice!=null&&item.amount!=null&&Math.abs(item.quantity*item.unitPrice-item.amount)>.01)) codes.add("ITEMS_MISMATCH");
  if(signatures.some(x=>x===null)) codes.add("SUPPORTING_DATA_INCOMPLETE");
  if(signatures[0]&&signatures.slice(1).some(x=>x&&JSON.stringify(x)!==JSON.stringify(signatures[0]))) codes.add("ITEMS_MISMATCH");
  return [...codes];
}
