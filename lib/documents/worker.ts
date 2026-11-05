import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { getExtractionProvider, type ExtractionResult } from "./azure";
import type { Json } from "@/lib/database.types";

/** One leased job per request bounds memory and runtime; database commits the result atomically. */
export async function processNextDocumentJob() {
  const db = createAdminClient();
  const { data: jobs, error } = await db.rpc("claim_document_job", {});
  if (error) throw new Error("JOB_CLAIM_FAILED");
  const job = jobs?.[0];
  if (!job?.lease_token) return { processed: 0 };
  const { data: doc } = await db.from("invoice_documents").select("id,document_type,storage_path,mime_type,original_filename").eq("id", job.document_id).maybeSingle();
  if (!doc) throw new Error("DOCUMENT_MISSING");
  let result: ExtractionResult;
  try {
    const { data: blob, error: downloadError } = await db.storage.from("invoice-documents").download(doc.storage_path);
    if (downloadError || !blob) throw new Error("DOCUMENT_DOWNLOAD_FAILED");
    const provider = getExtractionProvider();
    result = await provider.extractInvoice({ bytes: await blob.arrayBuffer(), mimeType: doc.mime_type, filename: doc.original_filename,documentType:doc.document_type });
  } catch {
    result = { provider: "document-worker", status: "failed" as const, fields: {}, raw: { reason: "EXTRACTION_REQUEST_FAILED" }, processedAt: new Date().toISOString() };
  }
  const { data: stored, error: storeError } = await db.rpc("finish_document_job", { p_job_id: job.id, p_lease_token: job.lease_token, p_status: result.status, p_provider: result.provider,
    p_data: { fields: result.fields, reviewReasons: result.reviewReasons ?? [], confidenceByField: result.confidenceByField ?? {}, processedAt: result.processedAt } as Json });
  if (storeError || !stored) throw new Error("JOB_RESULT_NOT_COMMITTED");
  return { processed: 1, outcome: result.status };
}
