import assert from "node:assert/strict";
import { test } from "node:test";
import { runRiskAssessment } from "./assess";
import { companyNamesMatch, type DocumentSnapshot, type InvoiceInput } from "./rules-engine";

// Mirrors public/demo/dummy-invoice.pdf as read by Azure prebuilt-invoice.
const ocr = {
  invoiceNumber: "INV-DEMO-2026-001",
  buyerName: "PT Andi Buyer A",
  vendorName: "PT Sari Vendor A",
  amount: 25_000_000,
  issueDate: "2026-09-17",
  dueDate: "2026-10-17",
};

const honest: InvoiceInput = {
  invoiceNumber: "INV-DEMO-2026-001",
  amount: 25_000_000,
  issueDate: "2026-09-17",
  dueDate: "2026-10-17",
  requestedAdvancePercent: 80,
  buyerStatus: "active",
  duplicateInvoiceHash: false,
  duplicateSupportingHash: false,
  buyerName: "PT Andi Buyer A",
  vendorName: "PT Sari Vendor A",
};

const documents: DocumentSnapshot[] = [
  { documentType: "invoice", sha256: "inv", extractionStatus: "completed", extracted: ocr },
  { documentType: "purchase_order", sha256: "po", extractionStatus: "pending" },
  { documentType: "bast", sha256: "bast", extractionStatus: "pending" },
];

function assess(invoice: InvoiceInput) {
  return runRiskAssessment({ invoice, documents, vendorHistory: [], azureConfigured: true });
}

test("honest invoice matching the OCR keeps a good band", () => {
  const result = assess(honest);
  assert.equal(result.riskBand, "A");
  assert.equal(result.anomalyFlags.length, 0);
});

test("inflated amount forces review regardless of score", () => {
  const result = assess({ ...honest, amount: 250_000_000 });
  assert.ok(result.score >= 60, "score alone would still look fundable");
  assert.equal(result.riskBand, "review");
  assert.ok(result.reasonCodes.some((r) => r.code === "AMOUNT_MISMATCH"));
});

test("changed invoice number forces review", () => {
  assert.equal(assess({ ...honest, invoiceNumber: "INV-X-9" }).riskBand, "review");
});

test("invoice addressed to another buyer forces review", () => {
  const result = assess({ ...honest, buyerName: "PT Budi Buyer B" });
  assert.equal(result.riskBand, "review");
  assert.ok(result.reasonCodes.some((r) => r.code === "BUYER_NAME_MISMATCH"));
});

test("invoice issued by another vendor forces review", () => {
  const result = assess({ ...honest, vendorName: "CV Lain Jaya" });
  assert.ok(result.reasonCodes.some((r) => r.code === "VENDOR_NAME_MISMATCH"));
  assert.equal(result.riskBand, "review");
});

test("company names tolerate legal forms, punctuation and OCR extras", () => {
  assert.ok(companyNamesMatch("PT Andi Buyer A", "Andi Buyer A, Tbk"));
  assert.ok(companyNamesMatch("PT. ANDI BUYER A - Finance Dept", "PT Andi Buyer A"));
  assert.ok(companyNamesMatch("PT Andi Buyer A (Persero)", "andi buyer a"));
  assert.ok(!companyNamesMatch("PT Andi Buyer A", "PT Andi Buyer B"));
  assert.ok(!companyNamesMatch("PT Sari Vendor A", "CV Lain Jaya"));
});
