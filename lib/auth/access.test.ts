import assert from "node:assert/strict";
import { test } from "node:test";
import { accountDestination } from "./access";
import { onboardingSchema, passwordUpdateSchema, signUpSchema } from "../validations";

test("account routing recovers incomplete enrollment and holds inactive organizations", () => {
  assert.equal(accountDestination(false), "/sign-in");
  assert.equal(accountDestination(true), "/onboarding");
  for (const status of ["pending", "suspended"] as const) {
    assert.equal(accountDestination(true, { role: "vendor", status }), "/account-status");
    assert.equal(accountDestination(true, { role: "admin", status }), "/account-status");
  }
  assert.equal(accountDestination(true, { role: "buyer", status: "active" }), "/app/buyer");
});
test("onboarding cannot request platform roles and new passwords require matching bounded values", () => {
  const organization = { fullName: "Vendor Contoh", organizationName: "Organisasi Contoh", organizationType: "vendor" };
  assert.ok(onboardingSchema.safeParse(organization).success);
  assert.ok(!onboardingSchema.safeParse({ ...organization, organizationType: "admin" }).success);
  assert.ok(!onboardingSchema.safeParse({ ...organization, organizationType: "platform" }).success);
  const password = "Prototipe!2026baru";
  assert.ok(passwordUpdateSchema.safeParse({ password, confirmPassword: password }).success);
  assert.ok(!passwordUpdateSchema.safeParse({ password, confirmPassword: "berbeda" }).success);
  assert.ok(!passwordUpdateSchema.safeParse({ password: "pendek", confirmPassword: "pendek" }).success);
  const tooManyBytes = "🔐".repeat(25);
  assert.ok(!passwordUpdateSchema.safeParse({ password: tooManyBytes, confirmPassword: tooManyBytes }).success);
  assert.ok(signUpSchema.safeParse({ fullName: "Nama Contoh", email: "user@example.test", password }).success);
});
