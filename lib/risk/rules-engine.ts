export const REASON_CODES = {
  DUPLICATE_INVOICE_FILE: "Hash SHA-256 invoice identik dengan dokumen yang sudah ada.",
  DUPLICATE_SUPPORTING_FILE: "PO atau BAST memakai hash yang sudah muncul di invoice lain.",
  INVOICE_NUMBER_MISMATCH: "Nomor invoice pada formulir tidak cocok dengan hasil OCR.",
  AMOUNT_MISMATCH: "Nominal formulir berbeda dari hasil ekstraksi dokumen.",
  DATE_MISMATCH: "Tanggal terbit atau jatuh tempo berbeda dari hasil OCR.",
  PO_AMOUNT_MISMATCH: "Nominal invoice tidak konsisten dengan Purchase Order.",
  BAST_AMOUNT_MISMATCH: "Nominal invoice tidak konsisten dengan BAST.",
  MISSING_INVOICE_DOCUMENT: "Berkas invoice belum diunggah.",
  MISSING_PO: "Purchase Order belum diunggah.",
  MISSING_BAST: "BAST belum diunggah.",
  OCR_NEEDS_REVIEW: "Ekstraksi dokumen belum selesai atau memerlukan pemeriksaan manual.",
  TENOR_TOO_SHORT: "Jangka waktu invoice kurang dari 7 hari.",
  TENOR_TOO_LONG: "Jangka waktu invoice lebih dari 180 hari.",
  ISSUE_AFTER_DUE: "Tanggal terbit melewati tanggal jatuh tempo.",
  AMOUNT_ABOVE_VENDOR_MEDIAN: "Nominal jauh di atas median histori vendor.",
  BUYER_NOT_ACTIVE: "Organisasi buyer belum berstatus aktif.",
  INSUFFICIENT_HISTORY: "Histori transaksi vendor belum cukup untuk Isolation Forest.",
  ISOLATION_FOREST_OUTLIER: "Pola transaksi menyimpang dari histori vendor (Isolation Forest).",
  HIGH_ADVANCE_RATIO: "Persentase pencairan yang diminta di atas 80%.",
  BUYER_NAME_MISMATCH: "Nama buyer pada dokumen berbeda dari organisasi buyer invoice.",
  VENDOR_NAME_MISMATCH: "Nama vendor pada dokumen berbeda dari organisasi vendor invoice.",
} as const;

export type ReasonCode = keyof typeof REASON_CODES;

export const SEVERITY: Record<ReasonCode, number> = {
  DUPLICATE_INVOICE_FILE: 35,
  DUPLICATE_SUPPORTING_FILE: 15,
  INVOICE_NUMBER_MISMATCH: 20,
  AMOUNT_MISMATCH: 18,
  DATE_MISMATCH: 12,
  PO_AMOUNT_MISMATCH: 14,
  BAST_AMOUNT_MISMATCH: 14,
  MISSING_INVOICE_DOCUMENT: 25,
  MISSING_PO: 10,
  MISSING_BAST: 10,
  OCR_NEEDS_REVIEW: 8,
  TENOR_TOO_SHORT: 16,
  TENOR_TOO_LONG: 12,
  ISSUE_AFTER_DUE: 25,
  AMOUNT_ABOVE_VENDOR_MEDIAN: 14,
  BUYER_NOT_ACTIVE: 22,
  INSUFFICIENT_HISTORY: 6,
  ISOLATION_FOREST_OUTLIER: 18,
  HIGH_ADVANCE_RATIO: 6,
  BUYER_NAME_MISMATCH: 20,
  VENDOR_NAME_MISMATCH: 20,
};

/**
 * Temuan yang mengindikasikan dokumen tidak sesuai dengan data yang diajukan.
 * Satu saja sudah cukup untuk memaksa band "review", berapa pun skornya, agar
 * invoice palsu tidak tampil sebagai A/B/C di marketplace.
 */
export const CRITICAL_CODES: ReadonlySet<ReasonCode> = new Set([
  "DUPLICATE_INVOICE_FILE",
  "INVOICE_NUMBER_MISMATCH",
  "AMOUNT_MISMATCH",
  "PO_AMOUNT_MISMATCH",
  "BAST_AMOUNT_MISMATCH",
  "BUYER_NAME_MISMATCH",
  "VENDOR_NAME_MISMATCH",
]);

export type ExtractedFields = {
  invoiceNumber?: string | null;
  buyerName?: string | null;
  vendorName?: string | null;
  amount?: number | null;
  issueDate?: string | null;
  dueDate?: string | null;
  purchaseOrder?: string | null;
  currency?: string | null;
  confidence?: number | null;
};

export type DocumentSnapshot = {
  documentType: "invoice" | "purchase_order" | "bast" | "other";
  sha256: string;
  extractionStatus: string;
  extracted?: ExtractedFields | null;
};

export type InvoiceInput = {
  invoiceNumber: string;
  amount: number;
  issueDate: string;
  dueDate: string;
  requestedAdvancePercent: number | null;
  buyerStatus: "pending" | "active" | "suspended";
  duplicateInvoiceHash: boolean;
  duplicateSupportingHash: boolean;
  /** Nama organisasi terdaftar, dibandingkan dengan nama hasil OCR. */
  buyerName?: string | null;
  vendorName?: string | null;
};

export type RuleFinding = {
  code: ReasonCode;
  message: string;
  anomaly: boolean;
};

export function daysBetween(start: string, end: string) {
  const a = Date.parse(start);
  const b = Date.parse(end);
  if (Number.isNaN(a) || Number.isNaN(b)) return 0;
  return Math.round((b - a) / 86_400_000);
}

function normalize(value?: string | null) {
  return (value ?? "").replace(/[\s.-]/g, "").toUpperCase();
}

function amountsDiffer(a?: number | null, b?: number | null, tolerance = 0.02) {
  if (a == null || b == null || a <= 0 || b <= 0) return false;
  return Math.abs(a - b) / Math.max(a, b) > tolerance;
}

const LEGAL_FORMS = new Set([
  "pt", "cv", "ud", "pd", "fa", "tbk", "persero", "perum", "perseroan", "terbatas",
  "ltd", "inc", "co", "corp", "llc",
]);

function nameTokens(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter((t) => t && !LEGAL_FORMS.has(t));
}

/**
 * Toleran terhadap bentuk badan usaha, tanda baca, dan tambahan kata dari OCR
 * (mis. "PT Andi Buyer A - Finance Dept" cocok dengan "Andi Buyer A, Tbk").
 */
export function companyNamesMatch(a: string, b: string) {
  const ta = new Set(nameTokens(a));
  const tb = new Set(nameTokens(b));
  if (ta.size === 0 || tb.size === 0) return true;
  const shared = [...ta].filter((t) => tb.has(t)).length;
  return shared === Math.min(ta.size, tb.size);
}

export function median(values: number[]) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((x, y) => x - y);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

export function runDocumentConsistencyRules(args: {
  invoice: InvoiceInput;
  documents: DocumentSnapshot[];
  vendorHistoricalAmounts: number[];
}): RuleFinding[] {
  const findings: RuleFinding[] = [];
  const add = (code: ReasonCode, anomaly = false) => {
    findings.push({ code, message: REASON_CODES[code], anomaly });
  };

  const invoiceDoc = args.documents.find((d) => d.documentType === "invoice");
  const poDoc = args.documents.find((d) => d.documentType === "purchase_order");
  const bastDoc = args.documents.find((d) => d.documentType === "bast");

  if (!invoiceDoc) add("MISSING_INVOICE_DOCUMENT", true);
  if (!poDoc) add("MISSING_PO");
  if (!bastDoc) add("MISSING_BAST");

  if (args.invoice.duplicateInvoiceHash) add("DUPLICATE_INVOICE_FILE", true);
  if (args.invoice.duplicateSupportingHash) add("DUPLICATE_SUPPORTING_FILE", true);

  if (args.invoice.buyerStatus !== "active") add("BUYER_NOT_ACTIVE", true);

  const tenor = daysBetween(args.invoice.issueDate, args.invoice.dueDate);
  if (tenor < 0) add("ISSUE_AFTER_DUE", true);
  else if (tenor < 7) add("TENOR_TOO_SHORT", true);
  else if (tenor > 180) add("TENOR_TOO_LONG");

  if ((args.invoice.requestedAdvancePercent ?? 80) > 80) add("HIGH_ADVANCE_RATIO");

  const histMedian = median(args.vendorHistoricalAmounts);
  if (histMedian && args.invoice.amount > histMedian * 3) {
    add("AMOUNT_ABOVE_VENDOR_MEDIAN", true);
  }

  const extractedInvoice = invoiceDoc?.extracted;
  if (
    invoiceDoc &&
    invoiceDoc.extractionStatus !== "completed" &&
    invoiceDoc.extractionStatus !== "needs_review"
  ) {
    add("OCR_NEEDS_REVIEW");
  }

  if (extractedInvoice?.invoiceNumber) {
    if (
      normalize(extractedInvoice.invoiceNumber) !==
      normalize(args.invoice.invoiceNumber)
    ) {
      add("INVOICE_NUMBER_MISMATCH", true);
    }
  }

  if (amountsDiffer(extractedInvoice?.amount, args.invoice.amount)) {
    add("AMOUNT_MISMATCH", true);
  }

  if (
    extractedInvoice?.issueDate &&
    extractedInvoice.issueDate.slice(0, 10) !== args.invoice.issueDate.slice(0, 10)
  ) {
    add("DATE_MISMATCH");
  }

  if (
    extractedInvoice?.dueDate &&
    extractedInvoice.dueDate.slice(0, 10) !== args.invoice.dueDate.slice(0, 10)
  ) {
    add("DATE_MISMATCH");
  }

  if (
    extractedInvoice?.buyerName &&
    args.invoice.buyerName &&
    !companyNamesMatch(extractedInvoice.buyerName, args.invoice.buyerName)
  ) {
    add("BUYER_NAME_MISMATCH", true);
  }

  if (
    extractedInvoice?.vendorName &&
    args.invoice.vendorName &&
    !companyNamesMatch(extractedInvoice.vendorName, args.invoice.vendorName)
  ) {
    add("VENDOR_NAME_MISMATCH", true);
  }

  if (amountsDiffer(poDoc?.extracted?.amount, args.invoice.amount, 0.05)) {
    add("PO_AMOUNT_MISMATCH", true);
  }
  if (amountsDiffer(bastDoc?.extracted?.amount, args.invoice.amount, 0.05)) {
    add("BAST_AMOUNT_MISMATCH", true);
  }

  return findings;
}

export function scoreFromFindings(findings: RuleFinding[]) {
  const penalty = findings.reduce((sum, f) => sum + SEVERITY[f.code], 0);
  return Math.max(0, Math.min(100, 100 - penalty));
}

export function bandFromScore(score: number, hasAnomaly: boolean, hasCritical = false) {
  if (hasCritical) return "review" as const;
  if (hasAnomaly && score < 50) return "review" as const;
  if (score >= 90) return "A" as const;
  if (score >= 75) return "B" as const;
  if (score >= 60) return "C" as const;
  if (score >= 40) return "D" as const;
  return "review" as const;
}
