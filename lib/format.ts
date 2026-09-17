export const IDR = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

export function formatIdr(value: number | string | null | undefined) {
  const n = typeof value === "string" ? Number(value) : value;
  if (n == null || Number.isNaN(n)) return "—";
  return IDR.format(n);
}

export function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
}

export function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export function tenorDays(issueDate: string, dueDate: string) {
  const a = Date.parse(issueDate);
  const b = Date.parse(dueDate);
  if (Number.isNaN(a) || Number.isNaN(b)) return 0;
  return Math.max(0, Math.round((b - a) / 86_400_000));
}

export const INVOICE_STATUS_LABEL: Record<string, string> = {
  draft: "Draf",
  submitted: "Diajukan",
  extraction_review: "Tinjau ekstraksi",
  buyer_review: "Menunggu buyer",
  risk_review: "Menunggu Risk Officer",
  eligible_for_funding: "Siap pendanaan",
  partially_funded: "Sebagian terdanai",
  funded: "Terdanai",
  rejected: "Ditolak",
  repaid: "Lunas",
};
