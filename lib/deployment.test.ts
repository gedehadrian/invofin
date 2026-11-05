import assert from "node:assert/strict";
import { test } from "node:test";
import { deploymentPolicy } from "./deployment";
import { getPaymentProvider } from "./funding/pricing";
test("production promotion rejects prototype target and incomplete config; payment stays disabled", async () => {
  assert.equal(deploymentPolicy({}).mode, "local");
  assert.throws(() =>
    deploymentPolicy({
      INVOFIN_DEPLOYMENT_ENV: "production",
      NEXT_PUBLIC_SUPABASE_URL: "https://skwwgjjgeativyevkkpl.supabase.co",
    }),
  );
  const config = {
    INVOFIN_DEPLOYMENT_ENV: "production",
    INVOFIN_PRODUCTION_PROJECT_REF: "abcdefghijklmnopqrst",
    NEXT_PUBLIC_SUPABASE_URL: "https://abcdefghijklmnopqrst.supabase.co",
    NEXT_PUBLIC_APP_ENV: "production",
    INVOFIN_OCR_MODE: "azure",
    CRON_SECRET: "x".repeat(64),
  };
  assert.throws(() => deploymentPolicy(config));
  const complete = {
    ...config,
    NEXT_PUBLIC_SITE_URL: "https://invofin.example",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-public-key",
    SUPABASE_SERVICE_ROLE_KEY: "test-server-key",
    AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT: "https://example.cognitiveservices.azure.com",
    AZURE_DOCUMENT_INTELLIGENCE_KEY: "test-provider-key",
  };
  assert.equal(deploymentPolicy(complete).syntheticExperiments, false);
  assert.equal(deploymentPolicy(complete).realPayments, false);
  assert.equal(
    (await getPaymentProvider().disburse({ opportunityId: "test", amount: 1 })).ok,
    false,
  );
});
