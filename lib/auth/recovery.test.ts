import assert from "node:assert/strict";
import { test } from "node:test";
import { recoveryResponse } from "./recovery";

test("recovery reports delivery failures and throttling without exposing account existence", () => {
  const accepted = recoveryResponse(null);
  assert.ok(accepted.success);
  for (const code of ["user_not_found", "email_not_found"]) {
    assert.deepEqual(recoveryResponse({ status: 404, code }), accepted);
  }
  const smtpFailure = recoveryResponse({ status: 500, code: "unexpected_failure" });
  assert.ok(smtpFailure.error);
  assert.equal(smtpFailure.success, undefined);
  const throttled = recoveryResponse({ status: 429, code: "over_email_send_rate_limit" });
  assert.ok(throttled.error?.includes("Terlalu banyak permintaan"));
  assert.notDeepEqual(throttled, smtpFailure);
});
