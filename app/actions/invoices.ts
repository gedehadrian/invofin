"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth/session";
import { getExtractionProvider } from "@/lib/documents/azure";
import { sanitizeFilename, sha256File, validateUpload } from "@/lib/documents/hash";
import { invoiceDraftSchema } from "@/lib/validations";
import type { DocumentType, Json } from "@/lib/database.types";

export type ActionState = { error?: string; success?: string; invoiceId?: string };

async function assertVendorRateLimit(userId: string) {
  const admin = createAdminClient();
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count } = await admin
    .from("invoices")
    .select("id", { count: "exact", head: true })
    .eq("created_by", userId)
    .gte("created_at", since);
  if ((count ?? 0) >= 20) {
    throw new Error("Batas pengajuan tercapai. Coba lagi dalam satu jam.");
  }
}

export async function saveInvoiceDraft(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const ctx = await requireRole(["vendor"]);
  const parsed = invoiceDraftSchema.safeParse({
    invoiceId: formData.get("invoiceId") || undefined,
    buyerOrgId: formData.get("buyerOrgId"),
    invoiceNumber: formData.get("invoiceNumber"),
    issueDate: formData.get("issueDate"),
    dueDate: formData.get("dueDate"),
    amount: formData.get("amount"),
    description: formData.get("description") || undefined,
    requestedAdvancePercent: formData.get("requestedAdvancePercent") || 80,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Data tidak valid." };
  }
  if (parsed.data.dueDate < parsed.data.issueDate) {
    return { error: "Tanggal jatuh tempo harus setelah tanggal terbit." };
  }

  const supabase = await createClient();
  const vendorOrgId = ctx.current.organization_id;

  if (parsed.data.invoiceId) {
    const { error } = await supabase
      .from("invoices")
      .update({
        buyer_org_id: parsed.data.buyerOrgId,
        invoice_number: parsed.data.invoiceNumber,
        issue_date: parsed.data.issueDate,
        due_date: parsed.data.dueDate,
        amount: parsed.data.amount,
        description: parsed.data.description ?? null,
        requested_advance_percent: parsed.data.requestedAdvancePercent,
      })
      .eq("id", parsed.data.invoiceId)
      .eq("vendor_org_id", vendorOrgId)
      .in("status", ["draft", "extraction_review"]);
    if (error) return { error: friendlyDbError(error.message) };
    revalidatePath("/app/vendor/invoices");
    return { success: "Draf disimpan.", invoiceId: parsed.data.invoiceId };
  }

  await assertVendorRateLimit(ctx.userId);
  const { data, error } = await supabase
    .from("invoices")
    .insert({
      vendor_org_id: vendorOrgId,
      buyer_org_id: parsed.data.buyerOrgId,
      invoice_number: parsed.data.invoiceNumber,
      issue_date: parsed.data.issueDate,
      due_date: parsed.data.dueDate,
      amount: parsed.data.amount,
      description: parsed.data.description ?? null,
      requested_advance_percent: parsed.data.requestedAdvancePercent,
      created_by: ctx.userId,
      status: "draft",
    })
    .select("id")
    .single();
  if (error || !data) return { error: friendlyDbError(error?.message ?? "Gagal menyimpan.") };
  revalidatePath("/app/vendor/invoices");
  return { success: "Draf dibuat.", invoiceId: data.id };
}

export async function uploadInvoiceDocument(formData: FormData): Promise<ActionState> {
  const ctx = await requireRole(["vendor"]);
  const invoiceId = String(formData.get("invoiceId") ?? "");
  const documentType = String(formData.get("documentType") ?? "") as DocumentType;
  const file = formData.get("file");
  if (!invoiceId || !["invoice", "purchase_order", "bast"].includes(documentType)) {
    return { error: "Data unggahan tidak lengkap." };
  }
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Pilih berkas terlebih dahulu." };
  }

  try {
    validateUpload(file);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Berkas tidak valid." };
  }

  const supabase = await createClient();
  const { data: invoice } = await supabase
    .from("invoices")
    .select("id, vendor_org_id, status")
    .eq("id", invoiceId)
    .eq("vendor_org_id", ctx.current.organization_id)
    .maybeSingle();
  if (!invoice || !["draft", "extraction_review"].includes(invoice.status)) {
    return { error: "Invoice tidak dapat menerima unggahan." };
  }

  const { hash, bytes } = await sha256File(file);
  const admin = createAdminClient();
  const { data: dupes } = await admin.rpc("duplicate_document_check", {
    p_sha256: hash,
  });
  const clash = (dupes ?? []).find((d) => d.invoice_id !== invoiceId);
  if (documentType === "invoice" && clash) {
    return {
      error: `Dokumen invoice duplikat (SHA-256). Sudah terdaftar pada invoice ${clash.invoice_id}.`,
    };
  }

  const documentId = crypto.randomUUID();
  const filename = sanitizeFilename(file.name);
  const storagePath = `${invoice.vendor_org_id}/${invoiceId}/${documentId}-${filename}`;

  const { error: uploadError } = await supabase.storage
    .from("invoice-documents")
    .upload(storagePath, bytes, { contentType: file.type, upsert: false });
  if (uploadError) return { error: uploadError.message };

  await supabase
    .from("invoice_documents")
    .delete()
    .eq("invoice_id", invoiceId)
    .eq("document_type", documentType);

  const { error: insertError } = await supabase.from("invoice_documents").insert({
    id: documentId,
    invoice_id: invoiceId,
    document_type: documentType,
    storage_path: storagePath,
    original_filename: file.name,
    mime_type: file.type,
    size_bytes: file.size,
    sha256: hash,
    extraction_status: documentType === "invoice" ? "processing" : "pending",
    uploaded_by: ctx.userId,
  });
  if (insertError) {
    await supabase.storage.from("invoice-documents").remove([storagePath]);
    return { error: friendlyDbError(insertError.message) };
  }

  if (documentType === "invoice") {
    const provider = getExtractionProvider();
    const result = await provider.extractInvoice({
      bytes,
      mimeType: file.type,
      filename: file.name,
    });
    await admin
      .from("invoice_documents")
      .update({
        extraction_status: result.status,
        extraction_provider: result.provider,
        extracted_data: {
          fields: result.fields,
          raw: result.raw as Json,
          processedAt: result.processedAt,
          duplicateWarning: clash
            ? { invoice_id: clash.invoice_id, document_id: clash.document_id }
            : null,
        },
      })
      .eq("id", documentId);
  } else if (clash) {
    await admin
      .from("invoice_documents")
      .update({
        extracted_data: {
          duplicateWarning: { invoice_id: clash.invoice_id, document_id: clash.document_id },
        },
      })
      .eq("id", documentId);
  }

  revalidatePath(`/app/vendor/invoices/${invoiceId}`);
  return { success: "Berkas diunggah.", invoiceId };
}

export async function submitInvoice(invoiceId: string): Promise<ActionState> {
  const ctx = await requireRole(["vendor"]);
  const supabase = await createClient();
  const { data: invoice } = await supabase
    .from("invoices")
    .select("*, invoice_documents(*)")
    .eq("id", invoiceId)
    .eq("vendor_org_id", ctx.current.organization_id)
    .maybeSingle();
  if (!invoice) return { error: "Invoice tidak ditemukan." };
  if (!["draft", "extraction_review"].includes(invoice.status)) {
    return { error: "Invoice sudah diajukan." };
  }

  const docs = invoice.invoice_documents ?? [];
  const hasInvoice = docs.some((d) => d.document_type === "invoice");
  if (!hasInvoice) return { error: "Unggah berkas invoice terlebih dahulu." };

  const needsReview = docs.some(
    (d) =>
      d.document_type === "invoice" &&
      ["pending", "processing", "needs_review", "failed"].includes(d.extraction_status),
  );

  const nextStatus = needsReview ? "extraction_review" : "buyer_review";
  const { error } = await supabase
    .from("invoices")
    .update({
      status: nextStatus,
      submitted_at: new Date().toISOString(),
    })
    .eq("id", invoiceId);
  if (error) return { error: error.message };

  revalidatePath("/app/vendor/invoices");
  return {
    success: needsReview
      ? "Invoice diajukan. Konfirmasi hasil ekstraksi sebelum buyer meninjau."
      : "Invoice diajukan ke buyer.",
    invoiceId,
  };
}

export async function confirmExtraction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const ctx = await requireRole(["vendor"]);
  const invoiceId = String(formData.get("invoiceId") ?? "");
  const supabase = await createClient();
  const { error } = await supabase
    .from("invoices")
    .update({
      invoice_number: String(formData.get("invoiceNumber") ?? ""),
      issue_date: String(formData.get("issueDate") ?? ""),
      due_date: String(formData.get("dueDate") ?? ""),
      amount: Number(formData.get("amount")),
      status: "buyer_review",
    })
    .eq("id", invoiceId)
    .eq("vendor_org_id", ctx.current.organization_id)
    .eq("status", "extraction_review");
  if (error) return { error: error.message };
  revalidatePath(`/app/vendor/invoices/${invoiceId}`);
  return { success: "Data dikonfirmasi. Invoice masuk antrean buyer.", invoiceId };
}

function friendlyDbError(message: string) {
  if (message.includes("invoice_documents_invoice_sha256_unique")) {
    return "File invoice ini sudah terdaftar (SHA-256 unik). Unggahan ditolak.";
  }
  if (message.includes("invoices_vendor_org_id_buyer_org_id_invoice_number_key")) {
    return "Nomor invoice sudah digunakan untuk buyer yang sama.";
  }
  return message;
}
