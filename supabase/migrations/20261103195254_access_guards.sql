-- Trusted onboarding writes membership; public clients cannot grant themselves roles.
drop policy if exists organizations_insert on public.organizations;
create policy organizations_insert on public.organizations for insert to authenticated
with check ((select public.is_admin()));
drop policy if exists members_insert on public.organization_members;
create policy members_insert on public.organization_members for insert to authenticated
with check ((select public.is_admin()));

create or replace function public.has_org_role(_org_id uuid, _role public.member_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.organization_members m join public.organizations o on o.id=m.organization_id
    where m.organization_id=_org_id and m.user_id=(select auth.uid()) and m.role=_role and o.status='active');
$$;
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.organization_members m join public.organizations o on o.id=m.organization_id
    where m.user_id=(select auth.uid()) and m.role='admin' and o.type='platform' and o.status='active');
$$;
create or replace function public.is_risk_officer()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.organization_members m join public.organizations o on o.id=m.organization_id
    where m.user_id=(select auth.uid()) and m.role='risk_officer' and o.type='platform' and o.status='active');
$$;

-- Server-only helpers never expose cross-tenant fingerprints or notification writes.
revoke all on function public.duplicate_document_check(text) from public, anon, authenticated;
grant execute on function public.duplicate_document_check(text) to service_role;
revoke all on function public.notify_org_role(uuid,public.member_role,text,text,text) from public, anon, authenticated;
revoke all on function public.notify_platform_staff(text,text,text) from public, anon, authenticated;
revoke all on function public.create_funding_commitment(uuid,numeric) from public, anon;

-- RLS determines the actor's rows; this guard also protects fields and transitions.
create or replace function public.guard_invoice_mutation()
returns trigger language plpgsql set search_path=public as $$
begin
  -- Trusted service-role writes and definer RPCs run as a different database role.
  if current_user <> 'authenticated' then return new; end if;
  if tg_op='INSERT' then
    if new.status <> 'draft' or new.created_by <> auth.uid() then raise exception 'Invoice must start as caller draft'; end if;
    return new;
  end if;
  if new.vendor_org_id <> old.vendor_org_id or new.buyer_org_id <> old.buyer_org_id
    or new.created_by <> old.created_by or new.created_at <> old.created_at then
    raise exception 'Invoice ownership is immutable';
  end if;
  if public.has_org_role(old.vendor_org_id,'vendor') then
    if old.status not in ('draft','extraction_review') or new.status not in ('draft','extraction_review','buyer_review') then
      raise exception 'Vendor cannot perform this transition';
    end if;
    if new.status='buyer_review' and not exists(select 1 from public.invoice_documents where invoice_id=old.id and document_type='invoice') then
      raise exception 'Invoice document required';
    end if;
  elsif public.has_org_role(old.buyer_org_id,'buyer') then
    if old.status <> 'buyer_review' or new.status not in ('risk_review','rejected') then raise exception 'Buyer cannot perform this transition'; end if;
    if new.amount <> old.amount or new.issue_date <> old.issue_date or new.due_date <> old.due_date or new.invoice_number <> old.invoice_number then
      raise exception 'Buyer cannot rewrite vendor invoice';
    end if;
    if not exists(select 1 from public.buyer_confirmations where invoice_id=old.id and buyer_org_id=old.buyer_org_id and decided_by=auth.uid()) then
      raise exception 'Buyer confirmation required';
    end if;
  else raise exception 'Use the authorized server workflow'; end if;
  return new;
end;
$$;
create trigger invoice_mutation_guard before insert or update on public.invoices
for each row execute function public.guard_invoice_mutation();

-- Confirmation identity and assessment association must match the invoice.
create or replace function public.guard_buyer_confirmation()
returns trigger language plpgsql set search_path=public as $$
begin
  if current_user <> 'authenticated' then return new; end if;
  if new.decided_by <> auth.uid() or not exists(select 1 from public.invoices i where i.id=new.invoice_id and i.buyer_org_id=new.buyer_org_id and i.status='buyer_review') then
    raise exception 'Invalid buyer confirmation';
  end if;
  return new;
end;
$$;
create trigger buyer_confirmation_guard before insert on public.buyer_confirmations
for each row execute function public.guard_buyer_confirmation();
