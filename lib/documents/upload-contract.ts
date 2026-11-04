import { z } from "zod";

export const uploadRequestSchema = z.object({
  invoiceId: z.string().uuid(), documentType: z.enum(["invoice", "purchase_order", "bast"]),
  filename: z.string().trim().min(1).max(120),
  mimeType: z.enum(["application/pdf", "image/jpeg", "image/png", "image/webp"]),
  sizeBytes: z.number().int().positive().max(10 * 1024 * 1024),
});
export function canModifyInvoice(status: string) { return ["draft", "extraction_review"].includes(status); }
export function uploadPaths(org: string, invoice: string, upload: string, filename: string) {
  // All IDs come from validated server records; original names are sanitized separately.
  return { quarantine: `${org}/${invoice}/${upload}`, verified: `${org}/${invoice}/${upload}-${filename}` };
}
