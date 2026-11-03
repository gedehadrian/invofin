import type { ExtractedFields } from "@/lib/risk/rules-engine";

export type AzureField = {
  content?: string; valueString?: string; valueDate?: string; valueNumber?: number;
  valueCurrency?: { amount?: number; currencyCode?: string }; confidence?: number;
};
export type ExtractionReview = { fields: ExtractedFields; confidenceByField: Record<string, number | null>; reviewReasons: string[] };

export function normalizeAmount(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) && value > 0 && value <= 1e12 ? value : null;
  if (typeof value !== "string") return null;
  let raw = value.trim().replace(/^(?:rp\.?|idr)\s*/i, "").replace(/\s*(?:idr)$/i, "").replace(/\s/g, "");
  if (!/^\d+(?:[.,]\d+)*$/.test(raw)) return null;
  const dots = (raw.match(/\./g) ?? []).length;
  const commas = (raw.match(/,/g) ?? []).length;
  if (dots && commas) {
    const decimal = raw.lastIndexOf(".") > raw.lastIndexOf(",") ? "." : ",";
    const group = decimal === "." ? "," : ".";
    const parts = raw.split(decimal);
    if (parts.length !== 2 || !/^\d{1,2}$/.test(parts[1])) return null;
    const groups = parts[0].split(group);
    if (!/^\d{1,3}$/.test(groups[0]) || groups.slice(1).some(part => !/^\d{3}$/.test(part))) return null;
    raw = groups.join("") + "." + parts[1];
  } else if (dots || commas) {
    const parts = raw.split(dots ? "." : ",");
    if (parts.length === 2 && parts[1].length <= 2) raw = parts.join(".");
    else {
      if (!/^\d{1,3}$/.test(parts[0]) || parts.slice(1).some(part => !/^\d{3}$/.test(part))) return null;
      raw = parts.join("");
    }
  }
  return normalizeAmount(Number(raw));
}

export function normalizeDate(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const raw = value.trim();
  let iso = raw;
  const local = /^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{4})$/.exec(raw);
  if (local) iso = `${local[3]}-${local[2].padStart(2, "0")}-${local[1].padStart(2, "0")}`;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const time = Date.parse(iso);
  return Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === iso ? iso : null;
}

function text(field?: AzureField) { return (field?.valueString ?? field?.content)?.trim() || null; }

/** Conservative extraction: uncertain fields must be confirmed, never silently approved. */
export function normalizeAzureFields(source: Record<string, AzureField>, threshold = .85): ExtractionReview {
  const buyer = source.CustomerName ?? source.CustomerAddressRecipient;
  const fields: ExtractedFields = {
    invoiceNumber: text(source.InvoiceId), buyerName: text(buyer), vendorName: text(source.VendorName),
    amount: normalizeAmount(source.InvoiceTotal?.valueCurrency?.amount ?? source.InvoiceTotal?.valueNumber ?? source.InvoiceTotal?.content),
    issueDate: normalizeDate(source.InvoiceDate?.valueDate ?? source.InvoiceDate?.content),
    dueDate: normalizeDate(source.DueDate?.valueDate ?? source.DueDate?.content),
    purchaseOrder: text(source.PurchaseOrder), currency: source.InvoiceTotal?.valueCurrency?.currencyCode?.toUpperCase() ?? null,
  };
  const required: [keyof ExtractedFields, AzureField | undefined][] = [["invoiceNumber", source.InvoiceId], ["buyerName", buyer], ["vendorName", source.VendorName], ["amount", source.InvoiceTotal], ["issueDate", source.InvoiceDate], ["dueDate", source.DueDate]];
  const confidenceByField: Record<string, number | null> = {};
  const reviewReasons: string[] = [];
  for (const [key, field] of required) {
    const confidence = field?.confidence;
    confidenceByField[key] = typeof confidence === "number" && Number.isFinite(confidence) && confidence >= 0 && confidence <= 1 ? confidence : null;
    if (fields[key] == null) reviewReasons.push(`MISSING_OR_INVALID:${key}`);
    else if (confidenceByField[key] == null || confidenceByField[key]! < threshold) reviewReasons.push(`LOW_CONFIDENCE:${key}`);
  }
  if (fields.issueDate && fields.dueDate && fields.dueDate < fields.issueDate) reviewReasons.push("INVALID_DATE_ORDER");
  if (fields.currency && fields.currency !== "IDR") reviewReasons.push("UNSUPPORTED_CURRENCY");
  fields.confidence = Math.min(...Object.values(confidenceByField).map(value => value ?? 0));
  return { fields, confidenceByField, reviewReasons };
}
