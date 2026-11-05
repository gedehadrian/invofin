import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

const uid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

test("PostgreSQL migrations and cross-organization authorization", async t => {
  const db = new PGlite();
  try {
    // Real PostgreSQL engine; Auth/Storage tables are fixtures, not Supabase services.
    await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
      create schema auth; create schema storage;
      create table auth.users(id uuid primary key, email text, raw_user_meta_data jsonb default '{}');
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      create function auth.role() returns text language sql stable as $$ select current_setting('request.jwt.claim.role',true) $$;
      create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
      create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text,owner uuid,metadata jsonb,unique(bucket_id,name));
      alter table storage.objects enable row level security;
      grant usage on schema auth,storage,public to anon,authenticated,service_role;
      grant select,insert,update,delete on all tables in schema storage to authenticated,service_role;
      alter default privileges in schema public grant select,insert,update,delete on tables to authenticated,service_role;
      grant execute on all functions in schema auth to anon,authenticated,service_role;`);
    for (const file of (await readdir("supabase/migrations")).filter(name => name.endsWith(".sql")).sort()) {
      // Cloud scheduler extensions (Vault, pg_net, pg_cron) are tested on the full Supabase stack.
      if (file.endsWith("_cloud_worker.sql")) continue;
      const sql = (await readFile(`supabase/migrations/${file}`, "utf8")).replace('create extension if not exists "pgcrypto";', "-- gen_random_uuid is built into PostgreSQL");
      await db.exec(sql);
    }
    for (let n=1;n<=7;n++) await db.query("insert into auth.users(id,email) values($1,$2)", [uid(n), `test${n}@invofin.invalid`]);
    const orgs = [[11,"vendor"],[12,"vendor"],[13,"buyer"],[14,"lender"],[15,"platform"],[16,"vendor"]] as const;
    for (const [id,type] of orgs) await db.query("insert into organizations(id,name,type,status) values($1,$2,$3,$4)",[uid(id),`Org ${id}`,type,id===16?"suspended":"active"]);
    const memberships = [[1,11,"vendor"],[2,12,"vendor"],[3,13,"buyer"],[4,14,"lender"],[5,15,"risk_officer"],[6,15,"admin"],[7,16,"vendor"]] as const;
    for (const [user,org,role] of memberships) await db.query("insert into organization_members(user_id,organization_id,role,is_primary) values($1,$2,$3,true)",[uid(user),uid(org),role]);
    await db.query("insert into invoices(id,vendor_org_id,buyer_org_id,invoice_number,issue_date,due_date,amount,created_by) values($1,$2,$3,'INV-A','2026-10-01','2026-12-01',1000000,$4)",[uid(21),uid(11),uid(13),uid(1)]);
    await db.query("insert into invoice_documents(id,invoice_id,document_type,storage_path,original_filename,mime_type,size_bytes,sha256,uploaded_by) values($1,$2,'invoice',$3,'invoice.pdf','application/pdf',100,$4,$5)",[uid(31),uid(21),`${uid(11)}/${uid(21)}/invoice.pdf`,"a".repeat(64),uid(1)]);
    async function asUser<T>(user: number, fn: () => Promise<T>) {
      await db.exec("set role authenticated");
      await db.query("select set_config('request.jwt.claim.sub',$1,false),set_config('request.jwt.claim.role','authenticated',false)",[uid(user)]);
      try { return await fn(); } finally { await db.exec("reset role"); }
    }
    await t.test("vendor sees only own invoices and buyer sees assigned invoices", async () => {
      assert.equal((await asUser(1,()=>db.query("select id from invoices"))).rows.length,1);
      assert.equal((await asUser(2,()=>db.query("select id from invoices"))).rows.length,0);
      assert.equal((await asUser(3,()=>db.query("select id from invoices"))).rows.length,1);
    });
    await t.test("client cannot self-enroll as admin or join another organization", async () => {
      await assert.rejects(asUser(1,()=>db.query("insert into organization_members(user_id,organization_id,role) values($1,$2,'admin')",[uid(1),uid(15)])));
      await assert.rejects(asUser(1,()=>db.query("insert into organizations(name,type,status) values('Fake','platform','active')")));
    });
    await t.test("business identity rejects same invoice after casing/whitespace or amount changes",async()=>{
      await assert.rejects(asUser(1,()=>db.query("insert into invoices(vendor_org_id,buyer_org_id,invoice_number,issue_date,due_date,amount,created_by) values($1,$2,' inv-a ','2026-10-01','2026-12-01',1000001,$3)",[uid(11),uid(13),uid(1)])));
    });
    await t.test("trusted onboarding is replay-safe, pending-only and atomic on membership failure", async () => {
      for (const n of [81,82]) await db.query("insert into auth.users(id,email) values($1,$2)",[uid(n),`onboarding${n}@invofin.invalid`]);
      const args = [uid(81),"Nama Contoh","Organisasi Baru","vendor","Manufaktur"];
      await assert.rejects(asUser(1,()=>db.query("select complete_onboarding($1,$2,$3,$4,$5)",args)));
      const call = "select complete_onboarding($1,$2,$3,$4,$5) as id";
      const org = (await db.query<{id:string}>(call,args)).rows[0].id;
      assert.equal((await db.query<{id:string}>(call,[uid(81),"Ubah Nama","Jangan Buat Ulang","lender",null])).rows[0].id,org);
      assert.equal((await db.query<{status:string}>("select status from organizations where id=$1",[org])).rows[0].status,"pending");
      assert.equal((await db.query("select id from organization_members where user_id=$1",[uid(81)])).rows.length,1);
      await assert.rejects(db.query(call,[uid(82),"Nama Contoh","Organisasi Platform","platform",null]));
      const count = (await db.query<{n:number}>("select count(*)::int as n from organizations")).rows[0].n;
      await db.exec(`create function public.reject_test_membership() returns trigger language plpgsql as $$ begin if new.user_id='${uid(82)}' then raise exception 'TEST_MEMBERSHIP_FAILURE'; end if; return new; end $$; create trigger reject_test_membership before insert on organization_members for each row execute function reject_test_membership();`);
      await assert.rejects(db.query(call,[uid(82),"Nama Contoh","Tidak Boleh Yatim","buyer",null]));
      assert.equal((await db.query<{n:number}>("select count(*)::int as n from organizations")).rows[0].n,count);
      await db.exec("drop trigger reject_test_membership on organization_members; drop function reject_test_membership()");
    });
    await t.test("anonymous clients cannot call role helpers and trigger functions are internal", async () => {
      const privileges = await db.query<{anon_helper:boolean;authenticated_helper:boolean;trigger_rpc:boolean}>("select has_function_privilege('anon','public.is_admin()','execute') as anon_helper,has_function_privilege('authenticated','public.is_admin()','execute') as authenticated_helper,has_function_privilege('authenticated','public.handle_new_user()','execute') as trigger_rpc");
      assert.deepEqual(privileges.rows[0], {anon_helper:false,authenticated_helper:true,trigger_rpc:false});
    });
    await t.test("vendor cannot forge funding status, ownership or other-tenant invoice", async () => {
      await assert.rejects(asUser(1,()=>db.query("update invoices set status='funded' where id=$1",[uid(21)])));
      await assert.rejects(asUser(1,()=>db.query("update invoices set buyer_org_id=$1 where id=$2",[uid(12),uid(21)])));
      await assert.rejects(asUser(2,()=>db.query("insert into invoices(vendor_org_id,buyer_org_id,invoice_number,issue_date,due_date,amount,created_by) values($1,$2,'FAKE','2026-10-01','2026-12-01',500,$3)",[uid(11),uid(13),uid(2)])));
    });
    await t.test("lender cannot read raw documents, drafts or internal duplicate lookup", async () => {
      assert.equal((await asUser(4,()=>db.query("select id from invoice_documents"))).rows.length,0);
      assert.equal((await asUser(4,()=>db.query("select id from invoices"))).rows.length,0);
      await assert.rejects(asUser(4,()=>db.query("select * from duplicate_document_check($1)",["a".repeat(64)])));
    });
    await t.test("suspended organizations fail active role checks; risk and admin roles remain distinct", async () => {
      assert.equal((await asUser(7,()=>db.query<{allowed:boolean}>("select has_org_role($1,'vendor') as allowed",[uid(16)]))).rows[0].allowed,false);
      assert.equal((await asUser(5,()=>db.query<{allowed:boolean}>("select is_admin() as allowed"))).rows[0].allowed,false);
      assert.equal((await asUser(6,()=>db.query<{allowed:boolean}>("select is_admin() as allowed"))).rows[0].allowed,true);
      // Platform staff can read audit evidence; only admin may administer organizations.
      assert.equal((await asUser(5,()=>db.query("select id from audit_logs where action='organization_onboarded'"))).rows.length,1);
    });
    await t.test("vendor cannot skip confirmation workflow and a foreign buyer cannot fabricate confirmation", async () => {
      await asUser(1,()=>db.query("update invoices set status='extraction_review' where id=$1",[uid(21)]));
      await assert.rejects(asUser(1,()=>db.query("update invoices set status='buyer_review' where id=$1",[uid(21)])));
      await assert.rejects(asUser(3,()=>db.query("insert into buyer_confirmations(invoice_id,buyer_org_id,decision,confirmed_amount,confirmed_due_date,decided_by) values($1,$2,'confirmed',1000000,'2026-12-01',$3)",[uid(21),uid(12),uid(3)])));
    });
    await t.test("human confirmation, buyer assessment, risk approval and funding are transactional", async () => {
      for (const [id,type] of [[32,"purchase_order"],[33,"bast"]]) await db.query("insert into invoice_documents(id,invoice_id,document_type,storage_path,original_filename,mime_type,size_bytes,sha256,uploaded_by,extraction_status) values($1,$2,$3,$4,'support.pdf','application/pdf',100,$5,$6,'needs_review')",[uid(Number(id)),uid(21),type,`verified/${id}.pdf`,String(id).repeat(32),uid(1)]);
      await db.query("update invoice_documents set extraction_status='needs_review' where invoice_id=$1",[uid(21)]);
      await db.query("update invoices set status='extraction_review' where id=$1",[uid(21)]);
      const confirmation=[uid(21),uid(1),uid(11),"INV-A","2026-10-01","2099-12-01",1000000];
      await db.query("select confirm_invoice_extraction($1,$2,$3,$4,$5,$6,$7)",confirmation);
      const assessment=JSON.stringify({score:90,riskBand:"A",reasonCodes:[],anomalyFlags:[],assessmentMethod:"test_fixture"});
      const decision=[uid(21),uid(3),uid(13),"confirmed",1000000,"2099-12-01","Sesuai dokumen",assessment];
      await db.query("select decide_buyer_invoice($1,$2,$3,$4,$5,$6,$7,$8)",decision);
      await db.query("select decide_buyer_invoice($1,$2,$3,$4,$5,$6,$7,$8)",decision);
      assert.equal((await db.query("select id from risk_assessments")).rows.length,1);
      await assert.rejects(db.query("select decide_risk_invoice($1,$2,'approved','Sudah diperiksa',800000,1.2,0.8)",[uid(21),uid(3)]));
      await db.query("select decide_risk_invoice($1,$2,'approved','Sudah diperiksa',800000,1.2,0.8)",[uid(21),uid(5)]);
      await db.query("select decide_risk_invoice($1,$2,'approved','Sudah diperiksa',800000,1.2,0.8)",[uid(21),uid(5)]);
      assert.equal((await db.query("select id from funding_opportunities")).rows.length,1);
      const opportunity=(await db.query<{id:string}>("select id from funding_opportunities")).rows[0].id;
      await asUser(4,()=>db.query("select commit_funding_once($1,300000,$2)",[opportunity,uid(51)]));
      await asUser(4,()=>db.query("select commit_funding_once($1,300000,$2)",[opportunity,uid(51)]));
      assert.equal((await db.query<{committed_amount:string}>("select committed_amount from funding_opportunities")).rows[0].committed_amount,"300000.00");
      await assert.rejects(asUser(4,()=>db.query("select commit_funding_once($1,300001,$2)",[opportunity,uid(51)])));
      await assert.rejects(asUser(4,()=>db.query("select commit_funding_once($1,600000,$2)",[opportunity,uid(52)])));
      assert.equal((await db.query("select * from funding_commitments")).rows.length,1);
      await asUser(4,()=>db.query("select commit_funding_once($1,500000,$2)",[opportunity,uid(53)]));
      assert.equal((await db.query<{status:string}>("select status from invoices")).rows[0].status,"funded");
    });
    await t.test("verified document evidence and worker RPCs cannot be written by clients", async () => {
      await assert.rejects(asUser(1,()=>db.query("update invoice_documents set sha256=$1 where id=$2",["b".repeat(64),uid(31)])));
      await assert.rejects(asUser(1,()=>db.query("select * from claim_document_job()")));
      await assert.rejects(asUser(4,()=>db.query("select * from document_jobs")));
    });
    await t.test("upload completion and job result are atomic, idempotent and lease-protected", async () => {
      await db.query("update invoices set status='draft' where id=$1",[uid(21)]);
      await db.query("insert into document_uploads(id,invoice_id,vendor_org_id,uploaded_by,document_type,original_filename,mime_type,size_bytes,storage_path,final_path) values($1,$2,$3,$4,'invoice','new.pdf','application/pdf',100,'q/new','verified/new.pdf')",[uid(41),uid(21),uid(11),uid(1)]);
      const params=[uid(41),"b".repeat(64),100,"application/pdf"];
      await db.query("select * from complete_document_upload($1,$2,$3,$4)",params);
      await db.query("select * from complete_document_upload($1,$2,$3,$4)",params);
      assert.equal((await db.query("select * from document_jobs")).rows.length,1);
      const job=(await db.query<{id:string;lease_token:string}>("select * from claim_document_job()")).rows[0];
      assert.equal((await db.query("select * from claim_document_job()")).rows.length,0);
      const stale=await db.query<{ok:boolean}>("select finish_document_job($1,$2,'completed','fixture','{}') as ok",[job.id,uid(99)]);
      assert.equal(stale.rows[0].ok,false);
      await db.query("select finish_document_job($1,$2,'failed','fixture','{}')",[job.id,job.lease_token]);
      assert.equal((await db.query<{status:string}>("select status from document_jobs")).rows[0].status,"retry");
      await db.exec("update document_jobs set next_attempt_at=now()-interval '1 second'");
      const retry=(await db.query<{id:string;lease_token:string}>("select * from claim_document_job()")).rows[0];
      await db.query("select finish_document_job($1,$2,'needs_review','fixture',$3)",[retry.id,retry.lease_token,JSON.stringify({fields:{amount:1000000}})]);
      assert.equal((await db.query<{status:string}>("select status from document_jobs")).rows[0].status,"completed");
      assert.equal((await db.query<{extraction_status:string}>("select extraction_status from invoice_documents where id=$1",[uid(41)])).rows[0].extraction_status,"needs_review");
    });
  } finally { await db.close(); }
});
