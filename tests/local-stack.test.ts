import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";
import type { Database, DocumentType } from "../lib/database.types";
import { runRiskAssessment } from "../lib/risk/assess";
import { sha256File, validateUpload } from "../lib/documents/hash";
import { uploadPaths } from "../lib/documents/upload-contract";
import { pricingFor } from "../lib/funding/pricing";

const url=process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
if (!["127.0.0.1","localhost","[::1]"].includes(new URL(url).hostname)) throw new Error("Integration tests are restricted to local Supabase.");
const anon=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const admin=createClient<Database>(url,process.env.SUPABASE_SERVICE_ROLE_KEY!,{auth:{persistSession:false,autoRefreshToken:false}});
const password="InvofinLocalTest!2026";

test("real local Supabase Auth, Storage, worker and invoice lifecycle", {timeout:180000}, async t=>{
  const accounts: Record<string,{id:string;org:string;db:ReturnType<typeof createClient<Database>>}>={};
  for (const [name,role] of [["vendor","vendor"],["other","vendor"],["buyer","buyer"],["lender","lender"],["risk","risk_officer"],["admin","admin"]] as const) {
    const email=`${name}.integration@invofin.test`;
    const created=await admin.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{full_name:`Integration ${name}`}});
    let id=created.data.user?.id;
    if (!id) id=(await admin.auth.admin.listUsers()).data.users.find(user=>user.email===email)?.id;
    assert.ok(id,`test account ${name}`);
    const orgType=role==="risk_officer"||role==="admin"?"platform":role;
    let org=(await admin.from("organizations").select("id").eq("name",`Integration ${name}`).maybeSingle()).data?.id;
    if (!org) { const result=await admin.from("organizations").insert({name:`Integration ${name}`,type:orgType,status:"active"}).select("id").single(); assert.ifError(result.error); org=result.data!.id; }
    const member=await admin.from("organization_members").upsert({user_id:id,organization_id:org,role,is_primary:true},{onConflict:"organization_id,user_id"}); assert.ifError(member.error);
    const db=createClient<Database>(url,anon,{auth:{persistSession:false,autoRefreshToken:false}});
    assert.ifError((await db.auth.signInWithPassword({email,password})).error);
    accounts[name]={id,org,db};
  }
  const {vendor,other,buyer,lender,risk}=accounts;
  const suffix=crypto.randomUUID();
  const due=new Date(Date.now()+45*86400000).toISOString().slice(0,10);
  const issue=new Date().toISOString().slice(0,10);
  const invoice=await vendor.db.from("invoices").insert({vendor_org_id:vendor.org,buyer_org_id:buyer.org,invoice_number:`INT-${suffix}`,issue_date:issue,due_date:due,amount:1000000,requested_advance_percent:80,created_by:vendor.id}).select("*").single();
  assert.ifError(invoice.error); const id=invoice.data!.id;
  await t.test("five roles authenticate and unauthorized tenant access is rejected",async()=>{
    assert.equal((await other.db.from("invoices").select("id").eq("id",id)).data?.length,0);
    assert.equal((await lender.db.from("invoices").select("id").eq("id",id)).data?.length,0);
    assert.ok((await vendor.db.from("organization_members").insert({user_id:vendor.id,organization_id:accounts.admin.org,role:"admin"})).error);
    assert.ok((await vendor.db.from("invoices").update({status:"funded"}).eq("id",id)).error);
    assert.ok((await vendor.db.storage.from("invoice-documents").upload(`${vendor.org}/${id}/unverified.pdf`,"%PDF-fake",{contentType:"application/pdf"})).error);
  });
  await t.test("direct signed upload stays quarantined until verified and replay creates one job",async()=>{
    const fixture=await readFile("public/demo/dummy-invoice.pdf");
    for (const type of ["invoice","purchase_order","bast"] as DocumentType[]) {
      const uploadId=crypto.randomUUID(); const paths=uploadPaths(vendor.org,id,uploadId,`${type}.pdf`);
      const file=new File([fixture,`\n%synthetic-${suffix}-${type}\n`],`${type}.pdf`,{type:"application/pdf"});
      await validateUpload(file); const {hash,bytes}=await sha256File(file);
      assert.ifError((await admin.from("document_uploads").insert({id:uploadId,invoice_id:id,vendor_org_id:vendor.org,uploaded_by:vendor.id,document_type:type,original_filename:file.name,mime_type:file.type,size_bytes:file.size,storage_path:paths.quarantine,final_path:paths.verified})).error);
      const signed=await admin.storage.from("invoice-uploads").createSignedUploadUrl(paths.quarantine,{upsert:false});assert.ifError(signed.error);
      assert.ifError((await vendor.db.storage.from("invoice-uploads").uploadToSignedUrl(paths.quarantine,signed.data!.token,file,{contentType:file.type})).error);
      assert.ok((await vendor.db.storage.from("invoice-uploads").download(paths.quarantine)).error);
      assert.ifError((await admin.storage.from("invoice-documents").upload(paths.verified,bytes,{contentType:file.type,upsert:false})).error);
      const args={p_upload_id:uploadId,p_sha256:hash,p_size:file.size,p_mime:file.type};
      assert.ok((await vendor.db.rpc("complete_document_upload",args)).error);
      assert.ifError((await admin.rpc("complete_document_upload",args)).error);
      assert.ifError((await admin.rpc("complete_document_upload",args)).error);
      assert.ifError((await admin.storage.from("invoice-uploads").remove([paths.quarantine])).error);
    }
    assert.equal((await vendor.db.from("invoice_documents").select("id").eq("invoice_id",id)).data?.length,3);
    assert.equal((await lender.db.from("invoice_documents").select("id").eq("invoice_id",id)).data?.length,0);
  });
  await t.test("worker endpoint rejects unauthorized requests and processes durable jobs",async()=>{
    const endpoint=new URL("/api/internal/document-jobs",process.env.WORKER_BASE_URL ?? "http://127.0.0.1:3100");
    assert.equal((await fetch(endpoint,{method:"POST"})).status,401);
    for(let count=0;count<30;count++) {
      const response=await fetch(endpoint,{method:"POST",headers:{Authorization:`Bearer ${process.env.CRON_SECRET}`},signal:AbortSignal.timeout(60000)});
      assert.equal(response.status,200);const result=await response.json();
      if(result.processed===0) break;
    }
    const docs=await vendor.db.from("invoice_documents").select("extraction_status").eq("invoice_id",id);
    assert.ok(docs.data?.every(doc=>["completed","needs_review"].includes(doc.extraction_status)));
    assert.ok((await vendor.db.from("document_jobs").select("id")).error);
  });
  await t.test("vendor confirms and buyer decision commits assessment once",async()=>{
    assert.ifError((await vendor.db.from("invoices").update({status:"extraction_review"}).eq("id",id)).error);
    assert.ok((await vendor.db.from("invoices").update({status:"buyer_review"}).eq("id",id)).error);
    assert.ifError((await admin.rpc("confirm_invoice_extraction",{p_invoice_id:id,p_actor:vendor.id,p_vendor:vendor.org,p_number:`INT-${suffix}`,p_issue:issue,p_due:due,p_amount:1000000})).error);
    const docs=(await admin.from("invoice_documents").select("*").eq("invoice_id",id)).data!;
    const assessment=runRiskAssessment({invoice:{invoiceNumber:`INT-${suffix}`,amount:1000000,issueDate:issue,dueDate:due,requestedAdvancePercent:80,buyerStatus:"active",duplicateInvoiceHash:false,duplicateSupportingHash:false},documents:docs.map(doc=>({documentType:doc.document_type,sha256:doc.sha256,extractionStatus:doc.extraction_status})),vendorHistory:[],azureConfigured:false});
    const args={p_invoice:id,p_actor:buyer.id,p_buyer:buyer.org,p_decision:"confirmed",p_amount:1000000,p_due:due,p_note:"Dokumen sintetis telah diperiksa",p_assessment:JSON.parse(JSON.stringify(assessment))};
    assert.ifError((await admin.rpc("decide_buyer_invoice",args)).error);
    assert.ifError((await admin.rpc("decide_buyer_invoice",args)).error);
    assert.equal((await admin.from("risk_assessments").select("id").eq("invoice_id",id)).data?.length,1);
  });
  let opportunity="";
  await t.test("risk decision rolls back invalid pricing and publishes one opportunity",async()=>{
    const riskRow=(await admin.from("risk_assessments").select("risk_band").eq("invoice_id",id).single()).data!;
    const fees=pricingFor({tenorDays:45,riskBand:riskRow.risk_band});
    const args={p_invoice:id,p_actor:risk.id,p_decision:"approved",p_note:"Simulasi pemeriksaan oleh Risk Officer",p_target:800000,p_vendor_fee:fees.vendorFeePercent,p_lender_return:fees.lenderReturnPercent};
    assert.ok((await admin.rpc("decide_risk_invoice",{...args,p_target:1})).error);
    assert.equal((await admin.from("invoices").select("status").eq("id",id).single()).data?.status,"risk_review");
    assert.ifError((await admin.rpc("decide_risk_invoice",args)).error);
    assert.ifError((await admin.rpc("decide_risk_invoice",args)).error);
    const opportunities=(await lender.db.from("funding_opportunities").select("id").eq("invoice_id",id)).data!;assert.equal(opportunities.length,1);opportunity=opportunities[0].id;
  });
  await t.test("concurrent identical commitments are idempotent and overfunding is rejected",async()=>{
    const args={p_opportunity:opportunity,p_amount:300000,p_request:crypto.randomUUID()};
    const attempts=await Promise.all([lender.db.rpc("commit_funding_once",args),lender.db.rpc("commit_funding_once",args)]);
    attempts.forEach(result=>assert.ifError(result.error));
    assert.equal(attempts[0].data?.id,attempts[1].data?.id);
    assert.equal(Number((await lender.db.from("funding_opportunities").select("committed_amount").eq("id",opportunity).single()).data?.committed_amount),300000);
    assert.ok((await lender.db.rpc("commit_funding_once",{...args,p_amount:300001})).error);
    assert.ok((await lender.db.rpc("commit_funding_once",{p_opportunity:opportunity,p_amount:600000,p_request:crypto.randomUUID()})).error);
    assert.ifError((await lender.db.rpc("commit_funding_once",{p_opportunity:opportunity,p_amount:500000,p_request:crypto.randomUUID()})).error);
    assert.equal((await admin.from("invoices").select("status").eq("id",id).single()).data?.status,"funded");
    assert.equal((await vendor.db.from("audit_logs").select("id")).data?.length,0);
    assert.ok((await vendor.db.from("notifications").select("id").eq("user_id",vendor.id)).data!.length>0);
  });
  console.log("Local lifecycle verified using synthetic records only; no funds transferred.");
});
