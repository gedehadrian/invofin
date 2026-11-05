const cents=(value:number)=>Math.round(value*100)/100;
export function financingBreakdown(invoiceAmount:number,advancePercent:number,vendorFeePercent:number) {
  if(![invoiceAmount,advancePercent,vendorFeePercent].every(Number.isFinite)||invoiceAmount<=0||invoiceAmount>1e12||advancePercent<10||advancePercent>90||vendorFeePercent<0||vendorFeePercent>3) throw new Error("INVALID_FINANCING_INPUT");
  const advance=cents(invoiceAmount*advancePercent/100),fee=cents(invoiceAmount*vendorFeePercent/100);
  return {invoiceAmount,advance,fee,netAdvance:cents(advance-fee),vendorFeePercent};
}
