/**
 * Development seed. Never run against production.
 *
 *   npx tsx scripts/seed.ts
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
}

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const PASSWORD = "InvofinDemo!2026";

const users = [
  { email: "vendor.a@invofin.demo", name: "Sari Vendor A", role: "vendor" as const },
  { email: "vendor.b@invofin.demo", name: "Budi Vendor B", role: "vendor" as const },
  { email: "buyer.a@invofin.demo", name: "Andi Buyer A", role: "buyer" as const },
  { email: "buyer.b@invofin.demo", name: "Maya Buyer B", role: "buyer" as const },
  { email: "lender.a@invofin.demo", name: "Lina Lender A", role: "lender" as const },
  { email: "lender.b@invofin.demo", name: "Raka Lender B", role: "lender" as const },
  { email: "admin@invofin.demo", name: "Admin InvoFin", role: "admin" as const },
  { email: "risk@invofin.demo", name: "Hafizh Risk", role: "risk_officer" as const },
];

async function upsertUser(email: string, name: string) {
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: name },
  });
  if (error && !error.message.toLowerCase().includes("already")) {
    throw error;
  }
  if (data.user) return data.user.id;
  const { data: list } = await supabase.auth.admin.listUsers();
  const existing = list.users.find((u) => u.email === email);
  if (!existing) throw new Error(`Cannot resolve user ${email}`);
  return existing.id;
}

async function main() {
  const ids: Record<string, string> = {};
  for (const user of users) {
    ids[user.email] = await upsertUser(user.email, user.name);
    await supabase.from("profiles").upsert({ id: ids[user.email], full_name: user.name });
  }

  const orgs = [
    { key: "vendorA", name: "PT Sari Komponen", type: "vendor", sector: "Manufaktur" },
    { key: "vendorB", name: "CV Budi Logistik", type: "vendor", sector: "Ritel" },
    { key: "buyerA", name: "PT Anchor Manufaktur", type: "buyer", sector: "Manufaktur" },
    { key: "buyerB", name: "PT Ritel Nusantara", type: "buyer", sector: "Ritel" },
    { key: "lenderA", name: "Dana Mitra A", type: "lender", sector: "Keuangan" },
    { key: "lenderB", name: "Dana Mitra B", type: "lender", sector: "Keuangan" },
    { key: "platform", name: "InvoFin Platform", type: "platform", sector: "Fintech" },
  ] as const;

  const orgIds: Record<string, string> = {};
  for (const org of orgs) {
    const { data } = await supabase
      .from("organizations")
      .insert({ name: org.name, type: org.type, sector: org.sector, status: "active" })
      .select("id")
      .single();
    if (!data) throw new Error(`Failed org ${org.name}`);
    orgIds[org.key] = data.id;
  }

  const memberships: [string, string, (typeof users)[number]["role"]][] = [
    ["vendor.a@invofin.demo", "vendorA", "vendor"],
    ["vendor.b@invofin.demo", "vendorB", "vendor"],
    ["buyer.a@invofin.demo", "buyerA", "buyer"],
    ["buyer.b@invofin.demo", "buyerB", "buyer"],
    ["lender.a@invofin.demo", "lenderA", "lender"],
    ["lender.b@invofin.demo", "lenderB", "lender"],
    ["admin@invofin.demo", "platform", "admin"],
    ["risk@invofin.demo", "platform", "risk_officer"],
  ];
  for (const [email, orgKey, role] of memberships) {
    await supabase.from("organization_members").insert({
      organization_id: orgIds[orgKey],
      user_id: ids[email],
      role,
      is_primary: true,
    });
  }

  const statuses = [
    "draft",
    "extraction_review",
    "buyer_review",
    "risk_review",
    "eligible_for_funding",
    "partially_funded",
    "funded",
    "rejected",
  ] as const;

  for (let i = 0; i < statuses.length; i++) {
    const vendorOrg = i % 2 === 0 ? orgIds.vendorA : orgIds.vendorB;
    const buyerOrg = i % 2 === 0 ? orgIds.buyerA : orgIds.buyerB;
    const createdBy = i % 2 === 0 ? ids["vendor.a@invofin.demo"] : ids["vendor.b@invofin.demo"];
    const issue = new Date("2026-08-01");
    issue.setDate(issue.getDate() + i);
    const due = new Date(issue);
    due.setDate(due.getDate() + 45);
    const { data: invoice, error } = await supabase
      .from("invoices")
      .insert({
        vendor_org_id: vendorOrg,
        buyer_org_id: buyerOrg,
        invoice_number: `INV-SEED-${1000 + i}`,
        issue_date: issue.toISOString().slice(0, 10),
        due_date: due.toISOString().slice(0, 10),
        amount: 150_000_000 + i * 5_000_000,
        requested_advance_percent: 80,
        status: statuses[i],
        created_by: createdBy,
        submitted_at: statuses[i] === "draft" ? null : new Date().toISOString(),
        description: `Invoice seed ${statuses[i]}`,
      })
      .select("id")
      .single();
    if (error || !invoice) throw error ?? new Error("invoice insert failed");

    if (["risk_review", "eligible_for_funding", "partially_funded", "funded"].includes(statuses[i])) {
      await supabase.from("risk_assessments").insert({
        invoice_id: invoice.id,
        score: statuses[i] === "risk_review" ? 58 : 82,
        risk_band: statuses[i] === "risk_review" ? "C" : "B",
        reason_codes: [{ code: "INSUFFICIENT_HISTORY", message: "Seed data" }],
        anomaly_flags: statuses[i] === "risk_review" ? [{ code: "AMOUNT_ABOVE_VENDOR_MEDIAN" }] : [],
        assessment_method: "rules_engine",
        requires_manual_review: true,
        decision: statuses[i] === "risk_review" ? null : "approved",
        reviewed_by: statuses[i] === "risk_review" ? null : ids["risk@invofin.demo"],
        reviewed_at: statuses[i] === "risk_review" ? null : new Date().toISOString(),
      });
    }

    if (["eligible_for_funding", "partially_funded", "funded"].includes(statuses[i])) {
      const target = 120_000_000;
      const committed = statuses[i] === "funded" ? target : statuses[i] === "partially_funded" ? 40_000_000 : 0;
      const { data: opp } = await supabase
        .from("funding_opportunities")
        .insert({
          invoice_id: invoice.id,
          target_amount: target,
          committed_amount: committed,
          vendor_fee_percent: 1.6,
          lender_return_percent: 1.2,
          opens_at: new Date().toISOString(),
          closes_at: new Date(Date.now() + 12 * 86_400_000).toISOString(),
          status: statuses[i] === "funded" ? "filled" : "open",
        })
        .select("id")
        .single();
      if (opp && committed > 0) {
        await supabase.from("funding_commitments").insert({
          opportunity_id: opp.id,
          lender_org_id: orgIds.lenderA,
          amount: committed,
          created_by: ids["lender.a@invofin.demo"],
        });
      }
    }
  }

  console.log("Seed complete. Demo password is in README (not printed here).");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
