/** Opt-in cloud smoke test. Only the dedicated synthetic vendor's PROTO-2026-001 is accepted. */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { setTimeout } from "node:timers/promises";
import { createClient } from "@supabase/supabase-js";
import type { Database, DocumentType } from "../lib/database.types";
import { uploadPaths } from "../lib/documents/upload-contract";
import { sha256File, validateUpload } from "../lib/documents/hash";
import { extractedFromJson, runRiskAssessment } from "../lib/risk/assess";
import { pricingFor } from "../lib/funding/pricing";

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const invoiceId = process.argv[process.argv.indexOf("--invoice") + 1];
  assert.ok(process.argv.includes("--apply") && process.argv.includes("--invoice"), "Use --apply --invoice <synthetic draft id>.");
  assert.equal(new URL(url).hostname, "skwwgjjgeativyevkkpl.supabase.co");
  const makeClient = (key: string) => createClient<Database>(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const admin = makeClient(process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const actors: Record<string, { id: string; org: string; db: ReturnType<typeof makeClient> }> = {};
  for (const key of ["VENDOR", "BUYER", "LENDER", "RISK", "ADMIN"]) {
    const email = process.env[`PROTOTYPE_${key}_EMAIL`]!;
    assert.equal(email, `${key.toLowerCase()}@prototype.invofin.test`);
    const db = makeClient(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
    const login = await db.auth.signInWithPassword({ email, password: process.env.PROTOTYPE_PASSWORD! });
    assert.ifError(login.error);
    const membership = await db.from("organization_members").select("organization_id").eq("user_id", login.data.user!.id).single();
    assert.ifError(membership.error);
    actors[key] = { id: login.data.user!.id, org: membership.data!.organization_id, db };
  }
  console.log("Five synthetic roles authenticated.");
  const vendor = actors.VENDOR, buyer = actors.BUYER, lender = actors.LENDER, risk = actors.RISK;
  const invoiceResult = await vendor.db.from("invoices").select("*").eq("id", invoiceId).single();
  assert.ifError(invoiceResult.error);
  const invoice = invoiceResult.data!;
  assert.equal(invoice.created_by, vendor.id);
  assert.equal(invoice.buyer_org_id, buyer.org);
  assert.equal(invoice.invoice_number, "PROTO-2026-001");
  assert.equal(Number(invoice.amount), 25000000);
  assert.ok(["draft", "extraction_review"].includes(invoice.status), "Smoke test requires an unsubmitted synthetic draft.");
  assert.equal((await lender.db.from("invoice_documents").select("id").eq("invoice_id", invoiceId)).data?.length, 0);
  assert.equal((await fetch("https://invofin-gede-hadrians-projects.vercel.app/api/internal/document-jobs", { method: "POST" })).status, 401);
  for (const [type, name] of [["invoice", "invoice"], ["purchase_order", "purchase-order"], ["bast", "bast"]] as [DocumentType, string][]) {
    const existing = await admin.from("invoice_documents").select("id").eq("invoice_id", invoiceId).eq("document_type", type);
    assert.ifError(existing.error);
    if (existing.data?.length) continue;
    const uploadId = crypto.randomUUID(), paths = uploadPaths(vendor.org, invoiceId, uploadId, `${name}.pdf`);
    const file = new File([await readFile(`public/demo/prototype-${name}.pdf`)], `${name}.pdf`, { type: "application/pdf" });
    await validateUpload(file);
    const { hash, bytes } = await sha256File(file);
    assert.ifError((await admin.from("document_uploads").insert({ id: uploadId, invoice_id: invoiceId, vendor_org_id: vendor.org, uploaded_by: vendor.id, document_type: type, original_filename: file.name, mime_type: file.type, size_bytes: file.size, storage_path: paths.quarantine, final_path: paths.verified })).error);
    const signed = await admin.storage.from("invoice-uploads").createSignedUploadUrl(paths.quarantine, { upsert: false });
    assert.ifError(signed.error);
    assert.ifError((await vendor.db.storage.from("invoice-uploads").uploadToSignedUrl(paths.quarantine, signed.data!.token, file, { contentType: file.type })).error);
    assert.ok((await vendor.db.storage.from("invoice-uploads").download(paths.quarantine)).error);
    const quarantine = await admin.storage.from("invoice-uploads").download(paths.quarantine);
    assert.ifError(quarantine.error);
    assert.deepEqual(new Uint8Array(await quarantine.data!.arrayBuffer()), new Uint8Array(bytes));
    assert.ifError((await admin.storage.from("invoice-documents").upload(paths.verified, bytes, { contentType: file.type, upsert: false })).error);
    assert.ifError((await admin.rpc("complete_document_upload", { p_upload_id: uploadId, p_sha256: hash, p_size: file.size, p_mime: file.type })).error);
    assert.ifError((await admin.storage.from("invoice-uploads").remove([paths.quarantine])).error);
  }
  console.log("Three private synthetic documents registered; waiting for cloud scheduler.");
  const deadline = Date.now() + 180000;
  while (true) {
    const docs = await admin.from("invoice_documents").select("*").eq("invoice_id", invoiceId);
    assert.ifError(docs.error);
    if (docs.data?.length === 3 && docs.data.every(doc => ["completed", "needs_review"].includes(doc.extraction_status))) break;
    assert.ok(!docs.data?.some(doc => doc.extraction_status === "failed"), "Document processing failed.");
    assert.ok(Date.now() < deadline, "Cloud scheduler did not finish within three minutes.");
    await setTimeout(5000);
  }
  console.log("Supabase Cron dispatched Vercel worker; OCR jobs completed.");
  assert.ifError((await vendor.db.from("invoices").update({ status: "extraction_review", submitted_at: new Date().toISOString() }).eq("id", invoiceId)).error);
  assert.ifError((await admin.rpc("confirm_invoice_extraction", { p_invoice_id: invoiceId, p_actor: vendor.id, p_vendor: vendor.org, p_number: invoice.invoice_number, p_issue: invoice.issue_date, p_due: invoice.due_date, p_amount: Number(invoice.amount) })).error);
  const docs = (await admin.from("invoice_documents").select("*").eq("invoice_id", invoiceId)).data!;
  const assessment = runRiskAssessment({ invoice: { invoiceNumber: invoice.invoice_number, amount: Number(invoice.amount), issueDate: invoice.issue_date, dueDate: invoice.due_date, requestedAdvancePercent: invoice.requested_advance_percent, buyerStatus: "active", buyerName: "Integration buyer", vendorName: "Integration vendor", duplicateInvoiceHash: false, duplicateSupportingHash: false }, documents: docs.map(doc => ({ documentType: doc.document_type, sha256: doc.sha256, extractionStatus: doc.extraction_status, extracted: extractedFromJson(doc.extracted_data) })), vendorHistory: [], azureConfigured: true });
  assert.ifError((await admin.rpc("decide_buyer_invoice", { p_invoice: invoiceId, p_actor: buyer.id, p_buyer: buyer.org, p_decision: "confirmed", p_amount: Number(invoice.amount), p_due: invoice.due_date, p_note: "SIMULASI: dokumen sintetis diperiksa untuk smoke test cloud.", p_assessment: JSON.parse(JSON.stringify(assessment)) })).error);
  const pricing = pricingFor({ tenorDays: 44, riskBand: assessment.riskBand });
  assert.ifError((await admin.rpc("decide_risk_invoice", { p_invoice: invoiceId, p_actor: risk.id, p_decision: "approved", p_note: "SIMULASI: persetujuan data sintetis, tanpa dana riil.", p_target: 20000000, p_vendor_fee: pricing.vendorFeePercent, p_lender_return: pricing.lenderReturnPercent })).error);
  const opportunity = await lender.db.from("funding_opportunities").select("id").eq("invoice_id", invoiceId).single();
  assert.ifError(opportunity.error);
  const args = { p_opportunity: opportunity.data!.id, p_amount: 1000000, p_request: crypto.randomUUID() };
  const attempts = await Promise.all([lender.db.rpc("commit_funding_once", args), lender.db.rpc("commit_funding_once", args)]);
  attempts.forEach(result => assert.ifError(result.error));
  assert.equal(attempts[0].data?.id, attempts[1].data?.id);
  assert.equal(Number((await admin.from("funding_opportunities").select("committed_amount").eq("id", opportunity.data!.id).single()).data!.committed_amount), 1000000);
  console.log("Buyer/risk decisions and concurrent idempotent lender commitment succeeded. No money transferred.");
}
main().catch(() => { console.error("Cloud prototype smoke test failed; inspect the current synthetic workflow before retrying. No credentials were logged."); process.exitCode = 1; });
