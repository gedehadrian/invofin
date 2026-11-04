"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sanitizeFilename, validateUpload, sha256File } from "@/lib/documents/hash";
import { canModifyInvoice, uploadPaths, uploadRequestSchema } from "@/lib/documents/upload-contract";

export async function prepareDocumentUpload(input: unknown) {
  const ctx = await requireRole(["vendor"]);
  const parsed = uploadRequestSchema.safeParse(input);
  if (!parsed.success) return { error: "Pilih dokumen PDF, JPG, PNG atau WEBP maksimal 10 MB." };
  if (ctx.current.role !== "vendor" || ctx.current.organizations.status !== "active") return { error: "Organisasi vendor belum aktif." };
  const db = await createClient();
  const { data: invoice, error } = await db.from("invoices").select("id,vendor_org_id,status").eq("id", parsed.data.invoiceId).eq("vendor_org_id", ctx.current.organization_id).maybeSingle();
  if (error || !invoice || !canModifyInvoice(invoice.status)) return { error: "Invoice tidak dapat menerima dokumen." };
  const admin = createAdminClient();
  const { count, error: countError } = await admin.from("document_uploads").select("id", { count: "exact", head: true }).eq("uploaded_by", ctx.userId).gte("created_at", new Date(Date.now() - 3600000).toISOString());
  if (countError || (count ?? 0) >= 30) return { error: "Unggahan sementara tidak tersedia atau batas unggahan tercapai. Coba lagi nanti." };
  const id = crypto.randomUUID();
  const filename = sanitizeFilename(parsed.data.filename);
  const paths = uploadPaths(invoice.vendor_org_id, invoice.id, id, filename);
  const { error: reservationError } = await admin.from("document_uploads").insert({ id, invoice_id: invoice.id, vendor_org_id: invoice.vendor_org_id, uploaded_by: ctx.userId, document_type: parsed.data.documentType, original_filename: filename, mime_type: parsed.data.mimeType, size_bytes: parsed.data.sizeBytes, storage_path: paths.quarantine, final_path: paths.verified });
  if (reservationError) return { error: "Reservasi unggahan gagal. Periksa migrasi database." };
  const { data: signed, error: signedError } = await admin.storage.from("invoice-uploads").createSignedUploadUrl(paths.quarantine, { upsert: false });
  if (signedError || !signed) return { error: "Izin unggahan belum tersedia. Silakan coba lagi." };
  return { uploadId: id, path: paths.quarantine, token: signed.token };
}

export async function finalizeDocumentUpload(uploadId: string) {
  const ctx = await requireRole(["vendor"]);
  if (!z.string().uuid().safeParse(uploadId).success) return { error: "Unggahan tidak dikenali." };
  if (ctx.current.role !== "vendor" || ctx.current.organizations.status !== "active") return { error: "Organisasi vendor belum aktif." };
  const admin = createAdminClient();
  const { data: reservation } = await admin.from("document_uploads").select("*").eq("id", uploadId).eq("uploaded_by", ctx.userId).eq("vendor_org_id", ctx.current.organization_id).maybeSingle();
  if (!reservation) return { error: "Unggahan tidak ditemukan." };
  if (reservation.document_id) return { success: "Dokumen sudah diverifikasi.", invoiceId: reservation.invoice_id };
  if (Date.parse(reservation.expires_at) < Date.now()) return { error: "Izin verifikasi kedaluwarsa. Unggah kembali dokumen." };
  const { data: invoice } = await admin.from("invoices").select("status").eq("id", reservation.invoice_id).eq("vendor_org_id", ctx.current.organization_id).maybeSingle();
  if (!invoice || !canModifyInvoice(invoice.status)) return { error: "Invoice tidak dapat menerima dokumen." };
  const { data: blob, error: downloadError } = await admin.storage.from("invoice-uploads").download(reservation.storage_path);
  if (downloadError || !blob) return { error: "Berkas belum tersedia. Coba selesaikan unggahan kembali." };
  const file = new File([blob], reservation.original_filename, { type: reservation.mime_type });
  try { await validateUpload(file); if (file.size !== reservation.size_bytes) throw new Error("Ukuran dokumen tidak sesuai reservasi."); }
  catch { await admin.storage.from("invoice-uploads").remove([reservation.storage_path]); return { error: "Isi atau ukuran dokumen tidak sesuai. Unggah berkas yang valid." }; }
  const { hash, bytes } = await sha256File(file);
  const { data: duplicate, error: dupeError } = await admin.rpc("duplicate_document_check", { p_sha256: hash });
  if (dupeError) return { error: "Pemeriksaan duplikasi belum tersedia." };
  if (reservation.document_type === "invoice" && duplicate?.some(row => row.invoice_id !== reservation.invoice_id)) return { error: "Dokumen invoice sudah pernah diajukan." };
  const { error: storeError } = await admin.storage.from("invoice-documents").upload(reservation.final_path, bytes, { contentType: reservation.mime_type, upsert: false });
  if (storeError) {
    // A previous request may have stored bytes but lost the database acknowledgement.
    const { data: replay } = await admin.from("document_uploads").select("document_id").eq("id", uploadId).maybeSingle();
    if (replay?.document_id) return { success: "Dokumen sudah diverifikasi.", invoiceId: reservation.invoice_id };
    const { data: stored } = await admin.storage.from("invoice-documents").download(reservation.final_path);
    if (!stored || stored.size !== file.size || (await sha256File(new File([stored], file.name, { type: file.type }))).hash !== hash) return { error: "Verifikasi sedang diproses atau penyimpanan gagal. Coba kembali." };
  }
  const { error: completeError } = await admin.rpc("complete_document_upload", { p_upload_id: uploadId, p_sha256: hash, p_size: file.size, p_mime: file.type });
  if (completeError) {
    // Never delete verified bytes on an ambiguous network/database acknowledgement.
    const { data: replay } = await admin.from("document_uploads").select("document_id").eq("id", uploadId).maybeSingle();
    if (replay?.document_id) return { success: "Dokumen sudah diverifikasi.", invoiceId: reservation.invoice_id };
    return { error: "Dokumen gagal dicatat: invoice terkunci, duplikat, atau reservasi kedaluwarsa." };
  }
  await admin.storage.from("invoice-uploads").remove([reservation.storage_path]);
  revalidatePath(`/app/vendor/invoices/${reservation.invoice_id}`);
  return { success: "Dokumen diverifikasi dan masuk antrean pemeriksaan.", invoiceId: reservation.invoice_id };
}
