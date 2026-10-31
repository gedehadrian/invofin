import { test } from "node:test";
import assert from "node:assert/strict";
import { invoiceDraftSchema, extractionConfirmSchema } from "./validations";

const draft = { buyerOrgId: "550e8400-e29b-41d4-a716-446655440000", invoiceNumber: "INV-001", issueDate: "2026-10-01", dueDate: "2026-11-01", amount: 1000000 };
test("invoice validation rejects impossible dates and non-finite amounts", () => {
  assert.equal(invoiceDraftSchema.safeParse(draft).success, true);
  for (const dueDate of ["2026-02-30", "2026-13-01", "", "01/11/2026"]) assert.equal(invoiceDraftSchema.safeParse({ ...draft, dueDate }).success, false);
  for (const amount of [Infinity, NaN, -1, 0, 1e13]) assert.equal(invoiceDraftSchema.safeParse({ ...draft, amount }).success, false);
  assert.equal(extractionConfirmSchema.safeParse({ invoiceId: draft.buyerOrgId, invoiceNumber: "INV-001", amount: 500, issueDate: "2026-10-05", dueDate: "2026-10-04" }).success, false);
});
