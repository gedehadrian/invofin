const cents=(value:number)=>Math.round(value*100)/100;
export function financingBreakdown(invoiceAmount:number,advancePercent:number,vendorFeePercent:number) {
  if(![invoiceAmount,advancePercent,vendorFeePercent].every(Number.isFinite)||invoiceAmount<=0||invoiceAmount>1e12||advancePercent<10||advancePercent>90||vendorFeePercent<0||vendorFeePercent>3) throw new Error("INVALID_FINANCING_INPUT");
  const advance=cents(invoiceAmount*advancePercent/100),fee=cents(invoiceAmount*vendorFeePercent/100);
  return {invoiceAmount,advance,fee,netAdvance:cents(advance-fee),vendorFeePercent};
}

/** Calculates full-cycle disbursement, lender return, vendor reserve, and platform spread revenue. */
export function settlementBreakdown(
  invoiceAmount: number,
  advancePercent: number,
  vendorFeePercent = 3,
  lenderReturnPercent = 1.2,
) {
  if (!Number.isFinite(lenderReturnPercent) || lenderReturnPercent < 0 || lenderReturnPercent > 25) {
    throw new Error("INVALID_FINANCING_INPUT");
  }
  const base = financingBreakdown(invoiceAmount, advancePercent, vendorFeePercent);
  const remainingReserve = cents(invoiceAmount - base.advance);
  const lenderReturn = cents((base.advance * lenderReturnPercent) / 100);
  const lenderTotalPayout = cents(base.advance + lenderReturn);
  const platformRevenue = cents(Math.max(0, base.fee - lenderReturn));

  return {
    ...base,
    lenderReturnPercent,
    lenderReturn,
    lenderTotalPayout,
    remainingReserve,
    platformRevenue,
  };
}
