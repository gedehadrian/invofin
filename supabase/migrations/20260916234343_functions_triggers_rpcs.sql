-- Functions, triggers, RPCs for InvoFin.

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_updated_at on public.profiles;
create trigger set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.organizations;
create trigger set_updated_at before update on public.organizations
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.invoices;
create trigger set_updated_at before update on public.invoices
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.funding_opportunities;
create trigger set_updated_at before update on public.funding_opportunities
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.funding_commitments;
create trigger set_updated_at before update on public.funding_commitments
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1), 'Pengguna InvoFin')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.current_user_id()
returns uuid
language sql
stable
as $$
  select (select auth.uid());
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members m
    where m.user_id = (select auth.uid())
      and m.role = 'admin'
  );
$$;

create or replace function public.is_risk_officer()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members m
    where m.user_id = (select auth.uid())
      and m.role = 'risk_officer'
  );
$$;

create or replace function public.is_platform_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin() or public.is_risk_officer();
$$;

create or replace function public.is_org_member(_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members m
    where m.organization_id = _org_id
      and m.user_id = (select auth.uid())
  );
$$;

create or replace function public.has_org_role(_org_id uuid, _role public.member_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members m
    where m.organization_id = _org_id
      and m.user_id = (select auth.uid())
      and m.role = _role
  );
$$;

create or replace function public.notify_org_role(
  _org_id uuid,
  _role public.member_role,
  _title text,
  _body text,
  _link text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications (user_id, title, body, link)
  select m.user_id, _title, _body, _link
  from public.organization_members m
  where m.organization_id = _org_id
    and m.role = _role;
end;
$$;

create or replace function public.notify_platform_staff(
  _title text,
  _body text,
  _link text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications (user_id, title, body, link)
  select distinct m.user_id, _title, _body, _link
  from public.organization_members m
  where m.role in ('admin', 'risk_officer');
end;
$$;

create or replace function public.record_invoice_status_history()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.status_history (invoice_id, from_status, to_status, changed_by)
    values (new.id, null, new.status::text, new.created_by);
    return new;
  end if;

  if old.status is distinct from new.status then
    insert into public.status_history (invoice_id, from_status, to_status, changed_by)
    values (new.id, old.status::text, new.status::text, (select auth.uid()));

    if new.status = 'submitted' then
      perform public.notify_org_role(
        new.buyer_org_id,
        'buyer',
        'Invoice menunggu konfirmasi',
        'Invoice ' || new.invoice_number || ' menunggu pemeriksaan buyer.',
        '/app/buyer/approvals/' || new.id::text
      );
      perform public.notify_platform_staff(
        'Invoice diajukan',
        'Invoice ' || new.invoice_number || ' telah diajukan vendor.',
        '/app/risk/invoices/' || new.id::text
      );
    elsif new.status = 'rejected' then
      perform public.notify_org_role(
        new.vendor_org_id,
        'vendor',
        'Invoice ditolak',
        'Invoice ' || new.invoice_number || ' ditolak. Periksa catatan keputusan.',
        '/app/vendor/invoices/' || new.id::text
      );
    elsif new.status = 'eligible_for_funding' then
      perform public.notify_org_role(
        new.vendor_org_id,
        'vendor',
        'Invoice lolos ke marketplace',
        'Invoice ' || new.invoice_number || ' siap ditawarkan ke lender.',
        '/app/vendor/invoices/' || new.id::text
      );
    elsif new.status in ('partially_funded', 'funded') then
      perform public.notify_org_role(
        new.vendor_org_id,
        'vendor',
        'Status pendanaan diperbarui',
        'Invoice ' || new.invoice_number || ' sekarang ' || replace(new.status::text, '_', ' ') || '.',
        '/app/vendor/invoices/' || new.id::text
      );
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists invoice_status_history on public.invoices;
create trigger invoice_status_history
after insert or update of status on public.invoices
for each row execute function public.record_invoice_status_history();

create or replace function public.audit_buyer_confirmation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.audit_logs (
    actor_user_id, organization_id, action, entity_type, entity_id, before_data, after_data
  ) values (
    new.decided_by,
    new.buyer_org_id,
    'buyer_decision',
    'buyer_confirmation',
    new.id,
    null,
    to_jsonb(new)
  );

  if new.decision = 'confirmed' then
    perform public.notify_org_role(
      (select vendor_org_id from public.invoices where id = new.invoice_id),
      'vendor',
      'Buyer mengonfirmasi invoice',
      'Invoice dikonfirmasi dan masuk antrean Risk Officer.',
      '/app/vendor/invoices/' || new.invoice_id::text
    );
    perform public.notify_platform_staff(
      'Invoice menunggu keputusan Risk Officer',
      'Buyer telah mengonfirmasi invoice. Keputusan akhir ada pada Risk Officer.',
      '/app/risk/invoices/' || new.invoice_id::text
    );
  else
    perform public.notify_org_role(
      (select vendor_org_id from public.invoices where id = new.invoice_id),
      'vendor',
      'Buyer menolak invoice',
      coalesce(new.note, 'Invoice disengketakan oleh buyer.'),
      '/app/vendor/invoices/' || new.invoice_id::text
    );
  end if;

  return new;
end;
$$;

drop trigger if exists audit_buyer_confirmation on public.buyer_confirmations;
create trigger audit_buyer_confirmation
after insert on public.buyer_confirmations
for each row execute function public.audit_buyer_confirmation();

create or replace function public.audit_risk_decision()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' and (
    old.decision is distinct from new.decision
    or old.reviewed_by is distinct from new.reviewed_by
  ) then
    insert into public.audit_logs (
      actor_user_id, action, entity_type, entity_id, before_data, after_data
    ) values (
      new.reviewed_by,
      'risk_decision',
      'risk_assessment',
      new.id,
      jsonb_build_object('decision', old.decision, 'note', old.decision_note),
      jsonb_build_object('decision', new.decision, 'note', new.decision_note, 'score', new.score, 'band', new.risk_band)
    );
  end if;
  return new;
end;
$$;

drop trigger if exists audit_risk_decision on public.risk_assessments;
create trigger audit_risk_decision
after update on public.risk_assessments
for each row execute function public.audit_risk_decision();

create or replace function public.audit_funding_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.status is distinct from new.status or old.committed_amount is distinct from new.committed_amount then
    insert into public.audit_logs (
      actor_user_id, action, entity_type, entity_id, before_data, after_data
    ) values (
      (select auth.uid()),
      'funding_update',
      'funding_opportunity',
      new.id,
      jsonb_build_object('status', old.status, 'committed_amount', old.committed_amount),
      jsonb_build_object('status', new.status, 'committed_amount', new.committed_amount)
    );
  end if;
  return new;
end;
$$;

drop trigger if exists audit_funding_status on public.funding_opportunities;
create trigger audit_funding_status
after update on public.funding_opportunities
for each row execute function public.audit_funding_status();

create or replace function public.duplicate_document_check(p_sha256 text)
returns table (
  document_id uuid,
  invoice_id uuid,
  document_type public.document_type,
  original_filename text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select d.id, d.invoice_id, d.document_type, d.original_filename, d.created_at
  from public.invoice_documents d
  where d.sha256 = p_sha256
  order by d.created_at asc;
$$;

create or replace function public.create_funding_commitment(
  p_opportunity_id uuid,
  p_amount numeric
)
returns public.funding_commitments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := (select auth.uid());
  v_lender_org uuid;
  v_opp public.funding_opportunities%rowtype;
  v_remaining numeric(18, 2);
  v_row public.funding_commitments%rowtype;
  v_recent int;
begin
  if v_user is null then
    raise exception 'Unauthenticated';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'Amount must be positive';
  end if;

  select count(*) into v_recent
  from public.funding_commitments
  where created_by = v_user
    and created_at > now() - interval '1 minute';

  if v_recent >= 8 then
    raise exception 'Rate limit: too many commitments';
  end if;

  select m.organization_id into v_lender_org
  from public.organization_members m
  join public.organizations o on o.id = m.organization_id
  where m.user_id = v_user
    and m.role = 'lender'
    and o.type = 'lender'
    and o.status = 'active'
  order by m.is_primary desc, m.created_at
  limit 1;

  if v_lender_org is null then
    raise exception 'No active lender organization';
  end if;

  select * into v_opp
  from public.funding_opportunities
  where id = p_opportunity_id
  for update;

  if not found then
    raise exception 'Opportunity not found';
  end if;

  if v_opp.status <> 'open' or now() < v_opp.opens_at or now() > v_opp.closes_at then
    raise exception 'Opportunity is not open';
  end if;

  v_remaining := v_opp.target_amount - v_opp.committed_amount;
  if p_amount > v_remaining then
    raise exception 'Commitment exceeds remaining target';
  end if;

  insert into public.funding_commitments (
    opportunity_id, lender_org_id, amount, status, created_by
  ) values (
    p_opportunity_id, v_lender_org, p_amount, 'committed', v_user
  )
  returning * into v_row;

  update public.funding_opportunities
  set
    committed_amount = committed_amount + p_amount,
    status = case
      when committed_amount + p_amount >= target_amount then 'filled'::public.funding_status
      else status
    end
  where id = p_opportunity_id
  returning * into v_opp;

  if v_opp.status = 'filled' then
    update public.invoices
    set status = 'funded'
    where id = v_opp.invoice_id
      and status in ('eligible_for_funding', 'partially_funded');
  else
    update public.invoices
    set status = 'partially_funded'
    where id = v_opp.invoice_id
      and status = 'eligible_for_funding';
  end if;

  insert into public.notifications (user_id, title, body, link)
  select m.user_id,
    'Komitmen pendanaan baru',
    'Lender berkomitmen pada invoice di marketplace.',
    '/app/lender/opportunities/' || v_opp.id::text
  from public.organization_members m
  join public.invoices i on i.vendor_org_id = m.organization_id
  where i.id = v_opp.invoice_id
    and m.role = 'vendor';

  return v_row;
end;
$$;

grant execute on function public.duplicate_document_check(text) to authenticated;
grant execute on function public.create_funding_commitment(uuid, numeric) to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_risk_officer() to authenticated;
grant execute on function public.is_platform_staff() to authenticated;
grant execute on function public.is_org_member(uuid) to authenticated;
grant execute on function public.has_org_role(uuid, public.member_role) to authenticated;
