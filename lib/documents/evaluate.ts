import type { ExtractedFields } from "@/lib/risk/rules-engine";

export type OcrLabels = Pick<ExtractedFields,"invoiceNumber"|"buyerName"|"vendorName"|"amount"|"issueDate"|"dueDate">;
const normalizeText=(value:unknown)=>typeof value==="string"?value.normalize("NFKC").trim().replace(/\s+/g," ").toLocaleUpperCase("id-ID"):null;

/** Compares against human labels; it never treats the provider's confidence as accuracy. */
export function evaluateExtraction(expected: OcrLabels, actual: ExtractedFields) {
  const result: Record<string,{correct:number;total:number;missing:number}>={};
  for(const key of Object.keys(expected) as (keyof OcrLabels)[]) {
    if(expected[key]==null) continue;
    const missing=actual[key]==null;
    const correct=key==="amount" ? typeof actual.amount==="number" && Number.isFinite(actual.amount) && Math.abs(actual.amount-Number(expected.amount))<.01
      : normalizeText(actual[key])===normalizeText(expected[key]);
    result[key]={correct:correct?1:0,total:1,missing:missing?1:0};
  }
  return result;
}
