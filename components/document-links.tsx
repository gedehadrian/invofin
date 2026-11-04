"use client";

import { createSignedDocumentUrl } from "@/app/actions/documents";
import type { InvoiceDocument } from "@/lib/database.types";
import { Button } from "@/components/ui/button";

const DOCUMENT_LABEL: Record<string, string> = { invoice: "Invoice", purchase_order: "Purchase Order", bast: "BAST", other: "Dokumen lain" };

export function DocumentLinks({ documents }: { documents: InvoiceDocument[] }) {
  if (documents.length === 0) {
    return <p className="mt-2 text-sm text-slate-500">Belum ada dokumen.</p>;
  }
  return (
    <ul className="mt-3 space-y-2 text-sm">
      {documents.map((doc) => (
        <li key={doc.id} className="flex items-center justify-between gap-3">
          <span>
            {DOCUMENT_LABEL[doc.document_type] ?? "Dokumen"} · {doc.original_filename}
          </span>
          <Button
            variant="outline"
            size="sm"
            type="button"
            aria-label={`Buka ${DOCUMENT_LABEL[doc.document_type] ?? "dokumen"}`}
            onClick={async () => {
              const url = await createSignedDocumentUrl(doc.id);
              window.open(url, "_blank", "noopener,noreferrer");
            }}
          >
            Buka
          </Button>
        </li>
      ))}
    </ul>
  );
}
