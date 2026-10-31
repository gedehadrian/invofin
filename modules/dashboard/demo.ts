import type { MemberRole } from "@/lib/database.types";
import type { DashboardData, InvoiceSummary } from "./types";

// Synthetic fixtures only. Never imported by the authenticated data access layer.
const fixtures: InvoiceSummary[] = [
  { id: "sample-1", number: "INV/2026/1028", counterparty: "PT Sumber Retail Indonesia", amount: 85000000, date: "2026-11-14", createdAt: "2026-10-28", status: "buyer_review" },
  { id: "sample-2", number: "INV/2026/1024", counterparty: "PT Nusantara Manufaktur", amount: 120000000, date: "2026-11-21", createdAt: "2026-10-24", status: "funded" },
  { id: "sample-3", number: "INV/2026/1021", counterparty: "PT Karya Bangun Persada", amount: 65000000, date: "2026-11-28", createdAt: "2026-10-21", status: "risk_review" },
  { id: "sample-4", number: "INV/2026/1018", counterparty: "PT Sumber Retail Indonesia", amount: 97500000, date: "2026-12-02", createdAt: "2026-10-18", status: "eligible_for_funding" },
  { id: "sample-5", number: "INV/2026/1015", counterparty: "PT Sentosa Distribusi", amount: 45000000, date: "2026-11-30", createdAt: "2026-10-15", status: "extraction_review" },
  { id: "sample-6", number: "INV/2026/1009", counterparty: "PT Nusantara Manufaktur", amount: 72000000, date: "2026-10-30", createdAt: "2026-10-09", status: "repaid" },
  ...[4, 5, 6, 7, 8, 9].map((month, i): InvoiceSummary => ({ id: `sample-history-${i}`, number: `INV/2026/0${month}01`, counterparty: "PT Sentosa Distribusi", amount: [62000000, 88000000, 74000000, 115000000, 98000000, 148000000][i], date: `2026-${String(month + 1).padStart(2, "0")}-20`, createdAt: `2026-${String(month).padStart(2, "0")}-01`, status: "repaid" })),
];

export function demoDashboard(role: MemberRole): DashboardData {
  const invoices = role === "buyer" ? fixtures.filter(row => row.counterparty === "PT Sumber Retail Indonesia") : role === "lender" ? fixtures.filter(row => ["eligible_for_funding", "funded", "repaid"].includes(row.status)) : fixtures;
  return { role, invoices: role === "buyer" ? invoices.map(row => ({ ...row, counterparty: "CV Berkah Nusantara" })) : invoices, metrics: { commitments: 240000000, organizations: 24, auditEvents: 148 } };
}
