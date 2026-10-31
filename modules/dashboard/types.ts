import type { InvoiceStatus, MemberRole } from "@/lib/database.types";

/** Deliberately excludes document paths, raw OCR, personal and bank information. */
export type InvoiceSummary = {
  id: string;
  number: string;
  counterparty: string;
  amount: number;
  date: string;
  createdAt: string;
  status: InvoiceStatus;
  href?: string;
};
export type DashboardData = {
  role: MemberRole;
  invoices: InvoiceSummary[];
  metrics?: { commitments?: number; organizations?: number; auditEvents?: number };
};
