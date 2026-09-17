import type { RiskBand } from "@/lib/database.types";

export function pricingFor(args: { tenorDays: number; riskBand: RiskBand }) {
  let vendorFee = 1.2;
  if (args.tenorDays > 45) vendorFee += 0.4;
  if (args.tenorDays > 90) vendorFee += 0.4;
  if (args.riskBand === "B") vendorFee += 0.3;
  if (args.riskBand === "C") vendorFee += 0.7;
  if (args.riskBand === "D" || args.riskBand === "review") vendorFee += 1.1;
  vendorFee = Math.min(3, Number(vendorFee.toFixed(2)));

  const lenderReturn = Number(Math.max(0.8, vendorFee - 0.4).toFixed(2));
  return { vendorFeePercent: vendorFee, lenderReturnPercent: lenderReturn };
}

export function targetAdvance(amount: number, percent: number | null) {
  return Number(((amount * (percent ?? 80)) / 100).toFixed(2));
}

export interface PaymentProvider {
  readonly name: string;
  disburse(input: { opportunityId: string; amount: number }): Promise<{
    ok: boolean;
    reference?: string;
    message: string;
  }>;
}

export class DeferredPaymentProvider implements PaymentProvider {
  readonly name = "deferred-legal-review";
  async disburse() {
    return {
      ok: false,
      message:
        "Pencairan dana sungguhan belum diaktifkan. Integrasi payment gateway menyusul setelah jalur legal dan compliance disetujui.",
    };
  }
}

export function getPaymentProvider(): PaymentProvider {
  return new DeferredPaymentProvider();
}
