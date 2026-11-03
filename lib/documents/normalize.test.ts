import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeAmount, normalizeDate, normalizeAzureFields, type AzureField } from "./normalize";

test("normalizes Indonesian and international invoice amounts without dropping decimal separators", () => {
  for (const [input, expected] of [["Rp 25.000.000", 25000000], ["IDR 1.250,50", 1250.5], ["25,000,000.00", 25000000], ["25000000.50", 25000000.5], ["1.234", 1234], ["1,25", 1.25], [500, 500]] as const) assert.equal(normalizeAmount(input), expected);
  for (const invalid of ["-500", "25.00.000", "1.23,00", "NaN", "1e6", "", Infinity, 0, 1e13]) assert.equal(normalizeAmount(invalid), null);
});
test("normalizes date-only values and rejects impossible dates", () => {
  assert.equal(normalizeDate("31/10/2026"), "2026-10-31");
  assert.equal(normalizeDate("2024-02-29"), "2024-02-29");
  for (const invalid of ["2026-02-29", "31/02/2026", "10/31/2026", "1/2/26", "", null]) assert.equal(normalizeDate(invalid), null);
});
const field = (valueString: string): AzureField => ({ valueString, content: valueString, confidence: .98 });
const valid = { InvoiceId: field("INV-001"), CustomerName: field("PT Buyer"), VendorName: field("CV Vendor"), InvoiceTotal: { valueCurrency: { amount: 25000000, currencyCode: "IDR" }, confidence: .99 }, InvoiceDate: { valueDate: "2026-10-01", confidence: .98 }, DueDate: { valueDate: "2026-11-01", confidence: .98 } };
test("requires complete fields and confidence for automatic extraction completion", () => {
  assert.deepEqual(normalizeAzureFields(valid).reviewReasons, []);
  const partial = normalizeAzureFields({ InvoiceId: field("INV-001") });
  assert.ok(partial.reviewReasons.includes("MISSING_OR_INVALID:amount"));
  assert.ok(normalizeAzureFields({ ...valid, InvoiceId: { ...field("INV-001"), confidence: .4 } }).reviewReasons.includes("LOW_CONFIDENCE:invoiceNumber"));
  assert.ok(normalizeAzureFields({ ...valid, InvoiceTotal: { valueNumber: 500 } }).reviewReasons.includes("LOW_CONFIDENCE:amount"));
  assert.ok(normalizeAzureFields({ ...valid, DueDate: { valueDate: "2026-01-01", confidence: .98 } }).reviewReasons.includes("INVALID_DATE_ORDER"));
});
