-- Quarantine uploads are never readable by users. Only verified bytes enter the document bucket.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('invoice-uploads','invoice-uploads',false,10485760,array['application/pdf','image/jpeg','image/png','image/webp'])
on conflict(id) do nothing;

create table public.document_uploads (
  id uuid primary key default gen_random_uuid(), invoice_id uuid not null references public.invoices(id) on delete cascade,
  vendor_org_id uuid not null references public.organizations(id), uploaded_by uuid not null references public.profiles(id),
  document_type public.document_type not null check(document_type in ('invoice','purchase_order','bast')),
  original_filename text not null check(length(original_filename) between 1 and 120),
  mime_type text not null, size_bytes bigint not null check(size_bytes between 1 and 10485760),
  storage_path text not null unique, final_path text not null unique,
  document_id uuid, expires_at timestamptz not null default now()+interval '20 minutes',
  created_at timestamptz not null default now()
);
create index document_uploads_user_created on public.document_uploads(uploaded_by,created_at);
alter table public.document_uploads enable row level security;
create policy uploads_read on public.document_uploads for select to authenticated
using(uploaded_by=(select auth.uid()));
revoke all on public.document_uploads from anon,authenticated;
grant select on public.document_uploads to authenticated;
grant all on public.document_uploads to service_role;

create table public.document_jobs (
  id uuid primary key default gen_random_uuid(), document_id uuid not null unique references public.invoice_documents(id) on delete cascade,
  status text not null default 'queued' check(status in ('queued','processing','retry','completed','failed')),
  attempts integer not null default 0, max_attempts integer not null default 3 check(max_attempts between 1 and 5),
  next_attempt_at timestamptz not null default now(), locked_until timestamptz, lease_token uuid,
  last_error_code text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index document_jobs_ready on public.document_jobs(next_attempt_at,created_at) where status in ('queued','retry','processing');
alter table public.document_jobs enable row level security;
revoke all on public.document_jobs from public,anon,authenticated;
grant all on public.document_jobs to service_role;

-- Clients cannot forge hashes, extraction evidence or replace verified Storage objects.
drop policy if exists documents_insert on public.invoice_documents;
drop policy if exists documents_update on public.invoice_documents;
drop policy if exists documents_delete on public.invoice_documents;
revoke insert,update,delete on public.invoice_documents from anon,authenticated;
drop policy if exists invoice_docs_insert on storage.objects;
drop policy if exists invoice_docs_update on storage.objects;
drop policy if exists invoice_docs_delete on storage.objects;

create function public.complete_document_upload(p_upload_id uuid,p_sha256 text,p_size bigint,p_mime text)
returns public.invoice_documents language plpgsql set search_path=public as $$
declare u public.document_uploads; i public.invoices; d public.invoice_documents;
begin
  select * into u from public.document_uploads where id=p_upload_id for update;
  if not found then raise exception 'UPLOAD_NOT_FOUND'; end if;
  if u.document_id is not null then
    select * into d from public.invoice_documents where id=u.document_id;
    if not found then raise exception 'UPLOAD_SUPERSEDED'; end if;
    return d;
  end if;
  if u.expires_at < now() then raise exception 'UPLOAD_EXPIRED'; end if;
  if p_sha256 !~ '^[a-f0-9]{64}$' or p_size <> u.size_bytes or p_mime <> u.mime_type then raise exception 'UPLOAD_MISMATCH'; end if;
  select * into i from public.invoices where id=u.invoice_id for update;
  if i.status not in ('draft','extraction_review') or i.vendor_org_id<>u.vendor_org_id then raise exception 'INVOICE_LOCKED'; end if;
  if not exists(select 1 from public.organization_members m join public.organizations o on o.id=m.organization_id where m.user_id=u.uploaded_by and m.organization_id=u.vendor_org_id and m.role='vendor' and o.status='active') then raise exception 'INACTIVE_VENDOR'; end if;
  -- Replacement is atomic; a rejected duplicate rolls back deletion of the previous document.
  delete from public.invoice_documents where invoice_id=u.invoice_id and document_type=u.document_type;
  insert into public.invoice_documents(id,invoice_id,document_type,storage_path,original_filename,mime_type,size_bytes,sha256,uploaded_by,extraction_status)
  values(u.id,u.invoice_id,u.document_type,u.final_path,u.original_filename,p_mime,p_size,p_sha256,u.uploaded_by,'pending') returning * into d;
  insert into public.document_jobs(document_id) values(d.id);
  update public.document_uploads set document_id=d.id where id=u.id;
  insert into public.audit_logs(actor_user_id,organization_id,action,entity_type,entity_id,after_data)
  values(u.uploaded_by,u.vendor_org_id,'document_verified','invoice_document',d.id,jsonb_build_object('sha256',p_sha256,'document_type',u.document_type));
  return d;
end;
$$;
revoke all on function public.complete_document_upload(uuid,text,bigint,text) from public,anon,authenticated;
grant execute on function public.complete_document_upload(uuid,text,bigint,text) to service_role;

create function public.claim_document_job()
returns setof public.document_jobs language plpgsql set search_path=public as $$
begin
  -- A crashed final attempt cannot leave a permanently processing document.
  with exhausted as (
    update public.document_jobs set status='failed',last_error_code='LEASE_EXHAUSTED',locked_until=null,lease_token=null,updated_at=now()
    where status='processing' and locked_until<now() and attempts>=max_attempts returning document_id
  ) update public.invoice_documents set extraction_status='failed' where id in(select document_id from exhausted);
  return query update public.document_jobs set status='processing',attempts=attempts+1,locked_until=now()+interval '90 seconds',lease_token=gen_random_uuid(),updated_at=now()
  where id=(select id from public.document_jobs where attempts<max_attempts and
    ((status in ('queued','retry') and next_attempt_at<=now()) or (status='processing' and locked_until<now()))
    order by created_at for update skip locked limit 1) returning *;
end;
$$;
revoke all on function public.claim_document_job() from public,anon,authenticated;
grant execute on function public.claim_document_job() to service_role;

create function public.finish_document_job(p_job_id uuid,p_lease_token uuid,p_status text,p_provider text,p_data jsonb)
returns boolean language plpgsql set search_path=public as $$
declare j public.document_jobs;
begin
  select * into j from public.document_jobs where id=p_job_id and status='processing' and lease_token=p_lease_token and locked_until>now() for update;
  if not found then return false; end if;
  if p_status not in ('completed','needs_review','failed') then raise exception 'INVALID_RESULT'; end if;
  if p_status='failed' and j.attempts<j.max_attempts then
    update public.document_jobs set status='retry',next_attempt_at=now()+make_interval(secs=>least(300,15*power(2,j.attempts)::int)),locked_until=null,lease_token=null,last_error_code='EXTRACTION_FAILED',updated_at=now() where id=j.id;
    update public.invoice_documents set extraction_status='pending' where id=j.document_id;
  else
    update public.document_jobs set status=case when p_status='failed' then 'failed' else 'completed' end,locked_until=null,lease_token=null,last_error_code=case when p_status='failed' then 'EXTRACTION_FAILED' else null end,updated_at=now() where id=j.id;
    update public.invoice_documents set extraction_status=p_status::public.extraction_status,extraction_provider=p_provider,extracted_data=p_data where id=j.document_id;
    insert into public.audit_logs(action,entity_type,entity_id,after_data) values('extraction_finished','invoice_document',j.document_id,jsonb_build_object('status',p_status,'attempts',j.attempts,'provider',p_provider));
  end if;
  return true;
end;
$$;
revoke all on function public.finish_document_job(uuid,uuid,text,text,jsonb) from public,anon,authenticated;
grant execute on function public.finish_document_job(uuid,uuid,text,text,jsonb) to service_role;

-- Even high-confidence OCR is confirmed explicitly by the vendor before buyer review.
create function public.guard_extraction_submission()
returns trigger language plpgsql set search_path=public as $$
begin
  if current_user='authenticated' and new.status='buyer_review' and old.status='draft' then raise exception 'EXTRACTION_CONFIRMATION_REQUIRED'; end if;
  return new;
end;
$$;
create trigger extraction_submission_guard before update on public.invoices
for each row execute function public.guard_extraction_submission();
