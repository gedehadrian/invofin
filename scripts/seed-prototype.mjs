import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { parseEnv } from "node:util";
import { randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

// Dedicated synthetic identities only. Existing organizations, invoices and users are preserved.
if (!process.argv.includes("--apply")) throw new Error("Use --apply to create the InvoFin prototype identities.");
const env = parseEnv(readFileSync(".env.local", "utf8"));
if ([process.env.INVOFIN_DEPLOYMENT_ENV,env.INVOFIN_DEPLOYMENT_ENV,process.env.NEXT_PUBLIC_APP_ENV,env.NEXT_PUBLIC_APP_ENV].includes("production")) throw new Error("Prototype seed is disabled in production.");
if (new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname !== "skwwgjjgeativyevkkpl.supabase.co") throw new Error("Expected the established InvoFin cloud project.");
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const credentialsPath = ".env.prototype.local";
const previous = existsSync(credentialsPath) ? parseEnv(readFileSync(credentialsPath, "utf8")) : {};
const password = previous.PROTOTYPE_PASSWORD || randomBytes(24).toString("base64url") + "!a7";
const actors = [
  { key: "VENDOR", role: "vendor", org: "Integration vendor", type: "vendor" },
  { key: "BUYER", role: "buyer", org: "Integration buyer", type: "buyer" },
  { key: "LENDER", role: "lender", org: "InvoFin Prototype Lender", type: "lender" },
  { key: "RISK", role: "risk_officer", org: "InvoFin Prototype Platform", type: "platform" },
  { key: "ADMIN", role: "admin", org: "InvoFin Prototype Platform", type: "platform" },
];
function checked(result) { if (result.error) throw new Error(`Prototype setup failed (${result.error.code || "request"}).`); return result.data; }
async function main() {
  // Save the generated password before provisioning so a partial retry keeps the same credentials.
  const output = { PROTOTYPE_PASSWORD: password };
  for (const actor of actors) output[`PROTOTYPE_${actor.key}_EMAIL`] = `${actor.key.toLowerCase()}@prototype.invofin.test`;
  writeFileSync(credentialsPath, Object.entries(output).map(([key, value]) => `${key}=${value}`).join("\n") + "\n", { mode: 0o600 });
  const orgs = new Map();
  for (const actor of actors) {
    const email = output[`PROTOTYPE_${actor.key}_EMAIL`];
    let user;
    for (let page = 1; page <= 100; page++) {
      const result = checked(await db.auth.admin.listUsers({ page, perPage: 100 }));
      user = result.users.find(item => item.email === email);
      if (user || result.users.length < 100) break;
    }
    if (!user) user = checked(await db.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: `Prototype ${actor.key}`, synthetic: true } })).user;
    else if (!previous.PROTOTYPE_PASSWORD) checked(await db.auth.admin.updateUserById(user.id, { password }));
    checked(await db.from("profiles").upsert({ id: user.id, full_name: `Prototype ${actor.key}` }));
    let org = orgs.get(actor.org);
    if (!org) {
      const matches = checked(await db.from("organizations").select("id,type,status").eq("name", actor.org));
      if (matches.length > 1 || matches.some(item => item.type !== actor.type || item.status !== "active")) throw new Error("Prototype organization conflicts with existing data; no existing organization was changed.");
      org = matches[0] || checked(await db.from("organizations").insert({ name: actor.org, type: actor.type, status: "active", sector: "Prototipe sintetis" }).select("id").single());
      orgs.set(actor.org, org);
    }
    const memberships = checked(await db.from("organization_members").select("organization_id,role").eq("user_id", user.id));
    if (memberships.some(item => item.organization_id !== org.id || item.role !== actor.role)) throw new Error("Prototype identity has an unexpected membership; no roles were changed.");
    if (!memberships.length) checked(await db.from("organization_members").insert({ organization_id: org.id, user_id: user.id, role: actor.role, is_primary: true }));
    console.log(`Ready: ${actor.role}`);
  }
  console.log(`Synthetic account credentials saved in ${credentialsPath} (ignored by Git). Existing data was preserved.`);
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
