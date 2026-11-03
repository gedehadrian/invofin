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
      grant execute on all functions in schema auth to anon,authenticated,service_role;`);
    for (const file of (await readdir("supabase/migrations")).filter(name => name.endsWith(".sql")).sort()) {
      const sql = (await readFile(`supabase/migrations/${file}`, "utf8")).replace('create extension if not exists "pgcrypto";', "-- gen_random_uuid is built into PostgreSQL");
      await db.exec(sql);
    }
    await db.exec(`grant select,insert,update,delete on all tables in schema public,storage to authenticated,service_role;`);
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
      assert.equal((await asUser(5,()=>db.query("select id from audit_logs"))).rows.length,0);
    });
    await t.test("vendor can submit a documented draft and a foreign buyer cannot fabricate confirmation", async () => {
      await asUser(1,()=>db.query("update invoices set status='buyer_review' where id=$1",[uid(21)]));
      await assert.rejects(asUser(3,()=>db.query("insert into buyer_confirmations(invoice_id,buyer_org_id,decision,confirmed_amount,confirmed_due_date,decided_by) values($1,$2,'confirmed',1000000,'2026-12-01',$3)",[uid(21),uid(12),uid(3)])));
    });
  } finally { await db.close(); }
});
