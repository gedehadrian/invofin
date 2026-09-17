import { z } from "zod";

export const signUpSchema = z.object({
  fullName: z.string().trim().min(3, "Nama lengkap minimal 3 karakter."),
  email: z.string().email("Email tidak valid."),
  password: z.string().min(8, "Kata sandi minimal 8 karakter."),
  organizationName: z.string().trim().min(2, "Nama organisasi wajib diisi."),
  organizationType: z.enum(["vendor", "buyer", "lender"]),
  taxId: z.string().trim().optional(),
  sector: z.string().trim().optional(),
});

export const signInSchema = z.object({
  email: z.string().email("Email tidak valid."),
  password: z.string().min(1, "Kata sandi wajib diisi."),
});

export const invoiceDraftSchema = z.object({
  invoiceId: z.string().uuid().optional(),
  buyerOrgId: z.string().uuid("Pilih organisasi buyer."),
  invoiceNumber: z.string().trim().min(3, "Nomor invoice wajib diisi."),
  issueDate: z.string().min(1, "Tanggal terbit wajib diisi."),
  dueDate: z.string().min(1, "Tanggal jatuh tempo wajib diisi."),
  amount: z.coerce.number().positive("Nominal harus lebih dari 0."),
  description: z.string().trim().optional(),
  requestedAdvancePercent: z.coerce.number().min(10).max(90).default(80),
});

export const extractionConfirmSchema = z.object({
  invoiceId: z.string().uuid(),
  invoiceNumber: z.string().trim().min(3),
  issueDate: z.string().min(1),
  dueDate: z.string().min(1),
  amount: z.coerce.number().positive(),
});

export const buyerDecisionSchema = z.discriminatedUnion("decision", [
  z.object({
    invoiceId: z.string().uuid(),
    decision: z.literal("confirmed"),
    confirmedAmount: z.coerce.number().positive(),
    confirmedDueDate: z.string().min(1),
    note: z.string().optional(),
  }),
  z.object({
    invoiceId: z.string().uuid(),
    decision: z.literal("disputed"),
    note: z.string().trim().min(8, "Alasan sengketa wajib diisi."),
  }),
]);

export const riskDecisionSchema = z.object({
  invoiceId: z.string().uuid(),
  decision: z.enum(["approved", "rejected"]),
  note: z.string().trim().min(8, "Catatan keputusan wajib diisi."),
});

export const fundingCommitmentSchema = z.object({
  opportunityId: z.string().uuid(),
  amount: z.coerce.number().positive("Nominal komitmen harus lebih dari 0."),
});
