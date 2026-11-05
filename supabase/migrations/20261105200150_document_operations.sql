alter table public.document_uploads add column quarantine_purged_at timestamptz;
create index document_uploads_retention on public.document_uploads(expires_at) where quarantine_purged_at is null;

create function public.reserve_document_upload(p_actor uuid,p_upload jsonb)
returns uuid language plpgsql set search_path='' as $$
declare i public.invoices; upload_id uuid=(p_upload->>'id')::uuid; total integer;
begin
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_actor::text,0));
 select * into i from public.invoices where id=(p_upload->>'invoice_id')::uuid for update;
 if not found or i.status not in ('draft','extraction_review') or i.vendor_org_id<>(p_upload->>'vendor_org_id')::uuid
  or not exists(select 1 from public.organization_members m join public.organizations o on o.id=m.organization_id where m.user_id=p_actor and m.organization_id=i.vendor_org_id and m.role='vendor' and o.status='active') then raise exception 'UPLOAD_FORBIDDEN'; end if;
 if (p_upload->>'size_bytes')::bigint not between 1 and 10485760 or p_upload->>'mime_type' not in ('application/pdf','image/jpeg','image/png','image/webp')
  or p_upload->>'document_type' not in ('invoice','purchase_order','bast')
  or not starts_with(p_upload->>'storage_path',i.vendor_org_id::text||'/'||i.id::text||'/')
  or not starts_with(p_upload->>'final_path',i.vendor_org_id::text||'/'||i.id::text||'/') then raise exception 'INVALID_UPLOAD'; end if;
 select count(*) into total from public.document_uploads where uploaded_by=p_actor and created_at>now()-interval '1 hour';
 if total>=30 then raise exception 'UPLOAD_RATE_LIMIT'; end if;
 insert into public.document_uploads(id,invoice_id,vendor_org_id,uploaded_by,document_type,original_filename,mime_type,size_bytes,storage_path,final_path)
 values(upload_id,i.id,i.vendor_org_id,p_actor,(p_upload->>'document_type')::public.document_type,p_upload->>'original_filename',p_upload->>'mime_type',(p_upload->>'size_bytes')::bigint,p_upload->>'storage_path',p_upload->>'final_path');
 return upload_id;
end; $$;
revoke all on function public.reserve_document_upload(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.reserve_document_upload(uuid,jsonb) to service_role;

create function public.retry_document_job(p_job uuid,p_actor uuid)
returns boolean language plpgsql set search_path='' as $$
declare document_ref uuid;
begin
 if not exists(select 1 from public.organization_members m join public.organizations o on o.id=m.organization_id where m.user_id=p_actor and m.role in ('admin','risk_officer') and o.type='platform' and o.status='active') then raise exception 'STAFF_REQUIRED'; end if;
 update public.document_jobs set status='queued',attempts=0,locked_until=null,lease_token=null,last_error_code=null,next_attempt_at=now(),updated_at=now() where id=p_job and status='failed' returning document_id into document_ref;
 if not found then return false; end if;
 update public.invoice_documents set extraction_status='pending' where id=document_ref;
 insert into public.audit_logs(actor_user_id,action,entity_type,entity_id) values(p_actor,'document_job_retried','document_job',p_job);
 return true;
end; $$;
revoke all on function public.retry_document_job(uuid,uuid) from public,anon,authenticated;
grant execute on function public.retry_document_job(uuid,uuid) to service_role;

create function public.notify_failed_document_job() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.status='failed' and old.status is distinct from 'failed' then
  perform public.notify_platform_staff('Pemeriksaan dokumen gagal','Periksa antrean operasional dan retry setelah penyebab diperbaiki.','/app/admin/jobs');
 end if;
 return new;
end; $$;
revoke all on function public.notify_failed_document_job() from public,anon,authenticated;
create trigger document_job_failure_notice after update of status on public.document_jobs for each row execute function public.notify_failed_document_job();
