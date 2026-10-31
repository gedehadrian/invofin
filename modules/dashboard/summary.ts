import type { InvoiceSummary } from "./types";

export function summarizeInvoices(rows: InvoiceSummary[]) {
  const sum = (items: InvoiceSummary[]) => items.reduce((total, row) => total + row.amount, 0);
  const funded = rows.filter(row => ["funded", "repaid"].includes(row.status));
  const pending = rows.filter(row => ["submitted", "extraction_review", "buyer_review", "risk_review"].includes(row.status));
  const active = rows.filter(row => !["draft", "rejected", "repaid"].includes(row.status));
  return { total: sum(active), funded: sum(funded), pending: pending.length, completed: rows.filter(row => row.status === "repaid").length, count: rows.length };
}

export function monthlyVolume(rows: InvoiceSummary[], year: number) {
  return Array.from({ length: 12 }, (_, month) => {
    const inMonth = rows.filter(row => row.createdAt.startsWith(`${year}-${String(month + 1).padStart(2, "0")}`));
    return { month, submitted: inMonth.filter(row => row.status !== "draft").reduce((sum, row) => sum + row.amount, 0), funded: inMonth.filter(row => ["funded", "repaid"].includes(row.status)).reduce((sum, row) => sum + row.amount, 0) };
  });
}
