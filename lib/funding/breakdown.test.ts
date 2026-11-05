import assert from "node:assert/strict";
import {test} from "node:test";
import {financingBreakdown} from "./breakdown";
test("financing fees use invoice basis and disclose net advance with cent rounding",()=>{
  assert.deepEqual(financingBreakdown(25000000,80,2.3),{invoiceAmount:25000000,advance:20000000,fee:575000,netAdvance:19425000,vendorFeePercent:2.3});
  assert.equal(financingBreakdown(123456.78,80,1.2).netAdvance,97283.94);
  assert.throws(()=>financingBreakdown(Infinity,80,1));
  assert.throws(()=>financingBreakdown(10000,80,30));
});
