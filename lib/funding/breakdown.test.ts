import assert from "node:assert/strict";
import {test} from "node:test";
import {financingBreakdown, settlementBreakdown} from "./breakdown";
test("financing fees use invoice basis and disclose net advance with cent rounding",()=>{
  assert.deepEqual(financingBreakdown(25000000,80,2.3),{invoiceAmount:25000000,advance:20000000,fee:575000,netAdvance:19425000,vendorFeePercent:2.3});
  assert.equal(financingBreakdown(123456.78,80,1.2).netAdvance,97283.94);
  assert.throws(()=>financingBreakdown(Infinity,80,1));
  assert.throws(()=>financingBreakdown(10000,80,30));
});

test("settlement breakdown computes lender payout, vendor reserve, and platform revenue", () => {
  const result = settlementBreakdown(100_000_000, 80, 2.5, 1.5);
  assert.equal(result.advance, 80_000_000);
  assert.equal(result.fee, 2_500_000);
  assert.equal(result.netAdvance, 77_500_000);
  assert.equal(result.remainingReserve, 20_000_000);
  assert.equal(result.lenderReturn, 1_200_000);
  assert.equal(result.lenderTotalPayout, 81_200_000);
  assert.equal(result.platformRevenue, 1_300_000);
  assert.throws(() => settlementBreakdown(10_000_000, 80, 2, 30));
});
