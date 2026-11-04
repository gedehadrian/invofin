-- Private invoice document storage.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'invoice-documents',
  'invoice-documents',
  false,
  10485760,
  array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists invoice_docs_select on storage.objects;
create policy invoice_docs_select on storage.objects
for select to authenticated
using (
  bucket_id = 'invoice-documents'
  and (
    (select public.is_platform_staff())
    or (select public.has_org_role((split_part(name, '/', 1))::uuid, 'vendor'))
    or exists (
      select 1 from public.invoices i
      where i.id = (split_part(name, '/', 2))::uuid
        and (select public.has_org_role(i.buyer_org_id, 'buyer'))
    )
  )
);

drop policy if exists invoice_docs_insert on storage.objects;
create policy invoice_docs_insert on storage.objects
for insert to authenticated
with check (
  bucket_id = 'invoice-documents'
  and (select public.has_org_role((split_part(name, '/', 1))::uuid, 'vendor'))
);

drop policy if exists invoice_docs_update on storage.objects;
create policy invoice_docs_update on storage.objects
for update to authenticated
using (
  bucket_id = 'invoice-documents'
  and (
    (select public.is_platform_staff())
    or (select public.has_org_role((split_part(name, '/', 1))::uuid, 'vendor'))
  )
)
with check (
  bucket_id = 'invoice-documents'
  and (
    (select public.is_platform_staff())
    or (select public.has_org_role((split_part(name, '/', 1))::uuid, 'vendor'))
  )
);

drop policy if exists invoice_docs_delete on storage.objects;
create policy invoice_docs_delete on storage.objects
for delete to authenticated
using (
  bucket_id = 'invoice-documents'
  and (
    (select public.is_admin())
    or (select public.has_org_role((split_part(name, '/', 1))::uuid, 'vendor'))
  )
);
