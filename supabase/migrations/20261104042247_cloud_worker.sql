-- Online processing without an always-on VPS: Supabase Cron dispatches bounded Vercel jobs.
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;
create extension if not exists supabase_vault with schema vault;
create schema if not exists private;
revoke all on schema private from public,anon,authenticated;
grant usage on schema private to service_role;

create table if not exists private.document_worker_settings (
  singleton boolean primary key default true check(singleton), endpoint text not null, secret_id uuid not null
);
alter table private.document_worker_settings enable row level security;
revoke all on private.document_worker_settings from public,anon,authenticated,service_role;

create or replace function private.configure_document_worker(p_endpoint text,p_secret text)
returns boolean language plpgsql security definer set search_path='' as $$
declare secret_ref uuid;
begin
  -- Bind this project's worker token to its own established production deployment.
  if p_endpoint <> 'https://invofin-gede-hadrians-projects.vercel.app/api/internal/document-jobs' or length(p_secret)<32 then raise exception 'INVALID_WORKER_CONFIGURATION'; end if;
  select id into secret_ref from vault.secrets where name='invofin_document_worker';
  if secret_ref is null then
    select vault.create_secret(p_secret,'invofin_document_worker','Token for the InvoFin document processing endpoint') into secret_ref;
  else perform vault.update_secret(secret_ref,p_secret,'invofin_document_worker','Token for the InvoFin document processing endpoint'); end if;
  insert into private.document_worker_settings(singleton,endpoint,secret_id) values(true,p_endpoint,secret_ref)
  on conflict(singleton) do update set endpoint=excluded.endpoint,secret_id=excluded.secret_id;
  return true;
end;
$$;
revoke all on function private.configure_document_worker(text,text) from public,anon,authenticated;
grant execute on function private.configure_document_worker(text,text) to service_role;

create or replace function public.configure_document_worker(p_endpoint text,p_secret text)
returns boolean language sql set search_path='' as $$ select private.configure_document_worker(p_endpoint,p_secret); $$;
revoke all on function public.configure_document_worker(text,text) from public,anon,authenticated;
grant execute on function public.configure_document_worker(text,text) to service_role;

create or replace function private.dispatch_document_jobs()
returns integer language plpgsql security definer set search_path='' as $$
declare target text; bearer text; ready integer; n integer;
begin
  select s.endpoint,v.decrypted_secret into target,bearer from private.document_worker_settings s join vault.decrypted_secrets v on v.id=s.secret_id where s.singleton;
  if target is null or bearer is null then return 0; end if;
  select least(count(*),3)::int into ready from public.document_jobs where
    (status in ('queued','retry') and next_attempt_at<=now()) or (status='processing' and locked_until<now());
  if ready=0 then return 0; end if;
  for n in 1..ready loop
    perform net.http_post(url:=target,headers:=jsonb_build_object('Authorization','Bearer '||bearer,'Content-Type','application/json'),body:='{}'::jsonb,timeout_milliseconds:=60000);
  end loop;
  return ready;
end;
$$;
revoke all on function private.dispatch_document_jobs() from public,anon,authenticated,service_role;
select cron.schedule('invofin-document-jobs','* * * * *','select private.dispatch_document_jobs()');
