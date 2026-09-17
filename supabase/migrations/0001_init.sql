-- InvoFin initial schema: enums, tables, indexes, constraints.
-- Idempotent-safe for a fresh Supabase project.

create extension if not exists "pgcrypto";

do $$ begin
  create type public.organization_type as enum ('vendor', 'buyer', 'lender', 'platform');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.organization_status as enum ('pending', 'active', 'suspended');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.member_role as enum ('vendor', 'buyer', 'lender', 'admin', 'risk_officer');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.invoice_status as enum (
    'draft',
    'submitted',
    'extraction_review',
    'buyer_review',
    'risk_review',
    'eligible_for_funding',
    'partially_funded',
    'funded',
    'rejected',
    'repaid'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.document_type as enum ('invoice', 'purchase_order', 'bast', 'other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.extraction_status as enum ('pending', 'processing', 'completed', 'needs_review', 'failed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.buyer_decision as enum ('confirmed', 'disputed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.risk_band as enum ('A', 'B', 'C', 'D', 'review');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.risk_decision as enum ('approved', 'rejected');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.funding_status as enum ('open', 'filled', 'closed', 'cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.commitment_status as enum ('committed', 'confirmed', 'cancelled');
exception when duplicate_object then null; end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  phone text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type public.organization_type not null,
  tax_id text,
  sector text,
  status public.organization_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.member_role not null,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  vendor_org_id uuid not null references public.organizations (id),
  buyer_org_id uuid not null references public.organizations (id),
  invoice_number text not null,
  issue_date date not null,
  due_date date not null,
  amount numeric(18, 2) not null check (amount > 0),
  currency text not null default 'IDR',
  description text,
  requested_advance_percent numeric(5, 2) check (
    requested_advance_percent is null
    or (requested_advance_percent >= 10 and requested_advance_percent <= 90)
  ),
  status public.invoice_status not null default 'draft',
  created_by uuid not null references public.profiles (id),
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (vendor_org_id, buyer_org_id, invoice_number),
  check (due_date >= issue_date),
  check (vendor_org_id <> buyer_org_id)
);

create table if not exists public.invoice_documents (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices (id) on delete cascade,
  document_type public.document_type not null,
  storage_path text not null unique,
  original_filename text not null,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes > 0),
  sha256 text not null,
  extraction_status public.extraction_status not null default 'pending',
  extracted_data jsonb,
  extraction_provider text,
  uploaded_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  unique (invoice_id, document_type)
);

create table if not exists public.buyer_confirmations (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null unique references public.invoices (id) on delete cascade,
  buyer_org_id uuid not null references public.organizations (id),
  decision public.buyer_decision not null,
  confirmed_amount numeric(18, 2),
  confirmed_due_date date,
  note text,
  decided_by uuid not null references public.profiles (id),
  decided_at timestamptz not null default now(),
  check (
    (decision = 'confirmed' and confirmed_amount is not null and confirmed_amount > 0 and confirmed_due_date is not null)
    or (decision = 'disputed' and note is not null and length(btrim(note)) > 0)
  )
);

create table if not exists public.risk_assessments (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices (id) on delete cascade,
  score integer not null check (score between 0 and 100),
  risk_band public.risk_band not null,
  reason_codes jsonb not null default '[]'::jsonb,
  anomaly_flags jsonb not null default '[]'::jsonb,
  assessment_method text not null,
  requires_manual_review boolean not null default true,
  decision public.risk_decision,
  decision_note text,
  reviewed_by uuid references public.profiles (id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.funding_opportunities (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null unique references public.invoices (id),
  target_amount numeric(18, 2) not null check (target_amount > 0),
  committed_amount numeric(18, 2) not null default 0 check (committed_amount >= 0),
  vendor_fee_percent numeric(5, 2) not null,
  lender_return_percent numeric(5, 2) not null,
  opens_at timestamptz not null,
  closes_at timestamptz not null,
  status public.funding_status not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (committed_amount <= target_amount),
  check (closes_at > opens_at)
);

create table if not exists public.funding_commitments (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.funding_opportunities (id),
  lender_org_id uuid not null references public.organizations (id),
  amount numeric(18, 2) not null check (amount > 0),
  status public.commitment_status not null default 'committed',
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.status_history (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices (id) on delete cascade,
  from_status text,
  to_status text not null,
  note text,
  changed_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  body text not null,
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references public.profiles (id),
  organization_id uuid references public.organizations (id),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  before_data jsonb,
  after_data jsonb,
  ip_address inet,
  created_at timestamptz not null default now()
);

create index if not exists organization_members_user_id_idx on public.organization_members (user_id);
create index if not exists organization_members_org_id_idx on public.organization_members (organization_id);
create index if not exists invoices_vendor_org_id_idx on public.invoices (vendor_org_id);
create index if not exists invoices_buyer_org_id_idx on public.invoices (buyer_org_id);
create index if not exists invoices_status_idx on public.invoices (status);
create index if not exists invoices_due_date_idx on public.invoices (due_date);
create index if not exists invoices_created_at_idx on public.invoices (created_at);
create index if not exists invoice_documents_invoice_id_idx on public.invoice_documents (invoice_id);
create index if not exists invoice_documents_sha256_idx on public.invoice_documents (sha256);
create index if not exists invoice_documents_extraction_status_idx on public.invoice_documents (extraction_status);
create index if not exists risk_assessments_invoice_id_idx on public.risk_assessments (invoice_id);
create index if not exists risk_assessments_risk_band_idx on public.risk_assessments (risk_band);
create index if not exists risk_assessments_manual_review_idx on public.risk_assessments (requires_manual_review);
create index if not exists risk_assessments_created_at_idx on public.risk_assessments (created_at);
create index if not exists funding_commitments_opportunity_id_idx on public.funding_commitments (opportunity_id);
create index if not exists funding_commitments_lender_org_id_idx on public.funding_commitments (lender_org_id);
create index if not exists funding_commitments_status_idx on public.funding_commitments (status);
create index if not exists funding_commitments_created_at_idx on public.funding_commitments (created_at);
create index if not exists status_history_invoice_id_idx on public.status_history (invoice_id);
create index if not exists status_history_created_at_idx on public.status_history (created_at);
create index if not exists notifications_user_id_idx on public.notifications (user_id);
create index if not exists notifications_read_at_idx on public.notifications (read_at);
create index if not exists notifications_created_at_idx on public.notifications (created_at);
create index if not exists audit_logs_actor_user_id_idx on public.audit_logs (actor_user_id);
create index if not exists audit_logs_organization_id_idx on public.audit_logs (organization_id);
create index if not exists audit_logs_entity_type_idx on public.audit_logs (entity_type);
create index if not exists audit_logs_entity_id_idx on public.audit_logs (entity_id);
create index if not exists audit_logs_created_at_idx on public.audit_logs (created_at);

-- Exact-file duplicate prevention for invoice PDFs/images.
create unique index if not exists invoice_documents_invoice_sha256_unique
  on public.invoice_documents (sha256)
  where document_type = 'invoice';
