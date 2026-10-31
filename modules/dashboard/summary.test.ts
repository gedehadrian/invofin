import { test } from "node:test";
import assert from "node:assert/strict";
import { summarizeInvoices, monthlyVolume } from "./summary";
import { isNavActive, navigation } from "../workspace/config";
import type { InvoiceSummary } from "./types";

const row = { id: "1", number: "INV-001", counterparty: "Buyer", amount: 100, date: "2026-11-01", createdAt: "2026-10-01", status: "funded" } satisfies InvoiceSummary;
test("summary excludes draft and rejected amounts from active volume and counts repayments separately", () => {
  const rows: InvoiceSummary[] = [row, { ...row, id: "2", status: "draft" }, { ...row, id: "3", status: "rejected" }, { ...row, id: "4", status: "repaid" }, { ...row, id: "5", status: "buyer_review" }];
  assert.deepEqual(summarizeInvoices(rows), { total: 200, funded: 200, pending: 1, completed: 1, count: 5 });
  assert.equal(monthlyVolume(rows, 2026)[9].submitted, 400);
  assert.equal(monthlyVolume(rows, 2026)[9].funded, 200);
  assert.equal(monthlyVolume(rows, 2025)[9].submitted, 0);
});
test("invoice creation marks only the most specific navigation link active", () => {
  const items = navigation("vendor");
  const active = items.filter(item => isNavActive("/app/vendor/invoices/new", item.href, items));
  assert.equal(active.length, 1);
  assert.equal(active[0].href, "/app/vendor/invoices/new");
});
