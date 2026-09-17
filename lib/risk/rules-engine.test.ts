import assert from "node:assert/strict";
import { test } from "node:test";
import {
  bandFromScore,
  runDocumentConsistencyRules,
  scoreFromFindings,
} from "./rules-engine";

test("flags duplicate invoice hash and missing supporting docs", () => {
  const findings = runDocumentConsistencyRules({
    invoice: {
      invoiceNumber: "INV-1",
      amount: 100_000_000,
      issueDate: "2026-09-01",
      dueDate: "2026-10-01",
      requestedAdvancePercent: 85,
      buyerStatus: "pending",
      duplicateInvoiceHash: true,
      duplicateSupportingHash: false,
    },
    documents: [
      {
        documentType: "invoice",
        sha256: "aaa",
        extractionStatus: "completed",
        extracted: { invoiceNumber: "INV-2", amount: 80_000_000 },
      },
    ],
    vendorHistoricalAmounts: [10_000_000, 12_000_000, 11_000_000],
  });
  const codes = findings.map((f) => f.code);
  assert.ok(codes.includes("DUPLICATE_INVOICE_FILE"));
  assert.ok(codes.includes("MISSING_PO"));
  assert.ok(codes.includes("INVOICE_NUMBER_MISMATCH"));
  assert.ok(codes.includes("BUYER_NOT_ACTIVE"));
  assert.equal(bandFromScore(scoreFromFindings(findings), true), "review");
});
