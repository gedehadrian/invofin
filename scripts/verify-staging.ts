import assert from "node:assert/strict";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "../lib/database.types";
import { deploymentPolicy } from "../lib/deployment";

let verificationStep = "environment";
async function main() {
  const policy = deploymentPolicy(process.env);
  assert.equal(policy.mode, "staging");
  assert.equal(policy.databaseHost, "skwwgjjgeativyevkkpl.supabase.co");
  const base = "https://invofin-gede-hadrians-projects.vercel.app";
  const roles = [
    ["VENDOR", "vendor", "Ringkasan usaha"],
    ["BUYER", "buyer", "Ringkasan verifikasi"],
    ["LENDER", "lender", "Ringkasan pendanaan"],
    ["RISK", "risk", "Ringkasan risiko"],
    ["ADMIN", "admin", "Ringkasan platform"],
  ] as const;
  let pages = 0;
  for (const [key, path, heading] of roles) {
    verificationStep = `${key} login`;
    const jar = new Map<string, string>();
    const db = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => [...jar].map(([name, value]) => ({ name, value })),
          setAll: (items) => items.forEach((x) => jar.set(x.name, x.value)),
        },
      },
    );
    const email = process.env[`PROTOTYPE_${key}_EMAIL`];
    assert.equal(email, `${key.toLowerCase()}@prototype.invofin.test`);
    const login = await db.auth.signInWithPassword({
      email: email!,
      password: process.env.PROTOTYPE_PASSWORD!,
    });
    assert.ifError(login.error);
    try {
      const page = async (route: string) => {
        verificationStep = `${key} ${route}`;
        const response = await fetch(base + route, {
          headers: {
            Cookie: [...jar].map(([name, value]) => `${name}=${value}`).join("; "),
          },
          signal: AbortSignal.timeout(25000),
        });
        assert.equal(response.status, 200);
        pages++;
        return response.text();
      };
      assert.ok((await page(`/app/${path}`)).includes(heading));
      if (key === "ADMIN" || key === "RISK") {
        assert.ok((await page("/app/admin/jobs")).includes("Operasional dokumen"));
        assert.ok((await page("/app/risk/lab")).includes("Laboratorium model sintetis"));
      } else {
        const body = await page("/app/admin/jobs");
        // Server Components may emit a 200 streamed response with a redirect digest.
        assert.ok(
          body.includes(heading) ||
            body.includes(`NEXT_REDIRECT;replace;/app/${path};307;`),
          "Non-staff must return to their own workspace.",
        );
        assert.ok(
          !body.includes("Operasional dokumen"),
          "Non-staff must not receive the operator page.",
        );
      }
      if (key === "LENDER")
        assert.equal((await db.from("invoice_documents").select("id")).data?.length, 0);
    } finally {
      await db.auth.signOut({ scope: "local" });
    }
  }
  verificationStep = "worker authorization";
  const worker = await fetch(base + "/api/internal/document-jobs", {
    method: "POST",
    signal: AbortSignal.timeout(25000),
  });
  assert.equal(worker.status, 401);
  verificationStep = "public security headers";
  const landing = await fetch(base, { signal: AbortSignal.timeout(25000) });
  assert.equal(landing.status, 200);
  assert.equal(landing.headers.get("x-content-type-options"), "nosniff");
  assert.equal(landing.headers.get("x-frame-options"), "DENY");
  console.log(
    JSON.stringify({
      verified: true,
      environment: policy.mode,
      roles: 5,
      authenticatedPages: pages,
      workerUnauthorizedStatus: 401,
      lenderRawDocuments: 0,
      realPayments: false,
    }),
  );
}
main().catch(() => {
  console.error(
    `Staging verification failed at ${verificationStep}. No credentials or page contents were logged.`,
  );
  process.exitCode = 1;
});
