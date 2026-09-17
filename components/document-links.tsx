"use client";

import { createSignedDocumentUrl } from "@/app/actions/documents";
import type { InvoiceDocument } from "@/lib/database.types";

export function DocumentLinks({ documents }: { documents: InvoiceDocument[] }) {
  if (documents.length === 0) {
    return <p className="mt-2 text-sm text-slate-500">Belum ada dokumen.</p>;
  }
  return (
    <ul className="mt-3 space-y-2 text-sm">
      {documents.map((doc) => (
        <li key={doc.id} className="flex items-center justify-between gap-3">
          <span>
            {doc.document_type} · {doc.original_filename}
            <span className="block text-[11px] text-slate-500">
              SHA-256 {doc.sha256.slice(0, 16)}…
            </span>
          </span>
          <button
            className="text-teal-300 hover:underline"
            type="button"
            onClick={async () => {
              const url = await createSignedDocumentUrl(doc.id);
              window.open(url, "_blank", "noopener,noreferrer");
            }}
          >
            Buka
          </button>
        </li>
      ))}
    </ul>
  );
}
