import { z } from "zod";

const labels=z.object({invoiceNumber:z.string().optional(),buyerName:z.string().optional(),vendorName:z.string().optional(),amount:z.number().positive().optional(),issueDate:z.string().optional(),dueDate:z.string().optional(),purchaseOrder:z.string().optional(),documentNumber:z.string().optional(),items:z.array(z.object({description:z.string(),quantity:z.number().positive(),unitPrice:z.number().positive().optional(),amount:z.number().positive().optional()})).optional()});
export const datasetSchema=z.object({schemaVersion:z.union([z.literal(1),z.literal(2)]),datasetKind:z.enum(["synthetic","representative"]),datasetVersion:z.string().optional(),cases:z.array(z.object({id:z.string(),sourceId:z.string().optional(),familyId:z.string().optional(),split:z.enum(["train","validation","test"]).optional(),documentType:z.enum(["invoice","purchase_order","bast"]).default("invoice"),augmentation:z.object({name:z.string()}).optional(),screeningExpected:z.enum(["consistent","review"]).optional(),file:z.string(),mimeType:z.enum(["application/pdf","image/jpeg","image/png"]),sha256:z.string().regex(/^[a-f0-9]{64}$/).optional(),expected:labels})).min(1).max(2000)});
export function parseDataset(value:unknown) {
  const dataset=datasetSchema.parse(value),sources=new Map<string,string>(),families=new Map<string,string>(),ids=new Set<string>();
  for(const item of dataset.cases) {
    if(ids.has(item.id)) throw new Error("Duplicate dataset case ID.");ids.add(item.id);
    if(dataset.schemaVersion===2 && (!item.sourceId||!item.familyId||!item.split||!item.sha256)) throw new Error("Dataset v2 requires lineage, split and checksum.");
    for(const [key,map] of [[item.sourceId,sources],[item.familyId,families]] as const) if(key && item.split) {
      if(map.has(key) && map.get(key)!==item.split) throw new Error("Dataset leakage across splits.");map.set(key,item.split);
    }
  }
  return dataset;
}
