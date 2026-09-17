"use server";

import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/session";

export async function createSignedDocumentUrl(documentId: string) {
  const ctx = await requireUser();
  if (ctx.current.role === "lender") {
    throw new Error("Lender tidak memiliki akses ke dokumen mentah.");
  }
  const supabase = await createClient();
  const { data: doc } = await supabase
    .from("invoice_documents")
    .select("storage_path")
    .eq("id", documentId)
    .maybeSingle();
  if (!doc) throw new Error("Dokumen tidak ditemukan.");
  const { data, error } = await supabase.storage
    .from("invoice-documents")
    .createSignedUrl(doc.storage_path, 120);
  if (error || !data) throw new Error(error?.message ?? "Gagal membuat tautan.");
  return data.signedUrl;
}
