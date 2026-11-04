-- Row Level Security. Policies use (select auth.uid()) and SECURITY DEFINER helpers.

alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.invoices enable row level security;
alter table public.invoice_documents enable row level security;
alter table public.buyer_confirmations enable row level security;
alter table public.risk_assessments enable row level security;
alter table public.funding_opportunities enable row level security;
alter table public.funding_commitments enable row level security;
alter table public.status_history enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_logs enable row level security;

alter table public.profiles force row level security;
alter table public.organizations force row level security;
alter table public.organization_members force row level security;
alter table public.invoices force row level security;
alter table public.invoice_documents force row level security;
alter table public.buyer_confirmations force row level security;
alter table public.risk_assessments force row level security;
alter table public.funding_opportunities force row level security;
alter table public.funding_commitments force row level security;
alter table public.status_history force row level security;
alter table public.notifications force row level security;
alter table public.audit_logs force row level security;

-- profiles
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
for select to authenticated
using (
  id = (select auth.uid())
  or (select public.is_admin())
);

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles
for update to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

drop policy if exists profiles_insert on public.profiles;
create policy profiles_insert on public.profiles
for insert to authenticated
with check (id = (select auth.uid()));

-- organizations
drop policy if exists organizations_select on public.organizations;
create policy organizations_select on public.organizations
for select to authenticated
using (
  (select public.is_platform_staff())
  or (select public.is_org_member(id))
  or (
    type = 'buyer'
    and status = 'active'
    and exists (
      select 1 from public.organization_members m
      where m.user_id = (select auth.uid())
        and m.role = 'vendor'
    )
  )
);

drop policy if exists organizations_insert on public.organizations;
create policy organizations_insert on public.organizations
for insert to authenticated
with check (true);

drop policy if exists organizations_update on public.organizations;
create policy organizations_update on public.organizations
for update to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

-- organization_members
drop policy if exists members_select on public.organization_members;
create policy members_select on public.organization_members
for select to authenticated
using (
  user_id = (select auth.uid())
  or (select public.is_org_member(organization_id))
  or (select public.is_admin())
);

drop policy if exists members_insert on public.organization_members;
create policy members_insert on public.organization_members
for insert to authenticated
with check (
  user_id = (select auth.uid())
  or (select public.is_admin())
);

drop policy if exists members_update on public.organization_members;
create policy members_update on public.organization_members
for update to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

drop policy if exists members_delete on public.organization_members;
create policy members_delete on public.organization_members
for delete to authenticated
using ((select public.is_admin()));

-- invoices
drop policy if exists invoices_select on public.invoices;
create policy invoices_select on public.invoices
for select to authenticated
using (
  (select public.is_platform_staff())
  or (select public.has_org_role(vendor_org_id, 'vendor'))
  or (select public.has_org_role(buyer_org_id, 'buyer'))
  or (
    status in ('eligible_for_funding', 'partially_funded', 'funded', 'repaid')
    and exists (
      select 1 from public.organization_members m
      join public.organizations o on o.id = m.organization_id
      where m.user_id = (select auth.uid())
        and m.role = 'lender'
        and o.type = 'lender'
        and o.status = 'active'
    )
  )
);

drop policy if exists invoices_insert on public.invoices;
create policy invoices_insert on public.invoices
for insert to authenticated
with check (
  created_by = (select auth.uid())
  and (select public.has_org_role(vendor_org_id, 'vendor'))
);

drop policy if exists invoices_update on public.invoices;
create policy invoices_update on public.invoices
for update to authenticated
using (
  (select public.is_platform_staff())
  or (select public.has_org_role(vendor_org_id, 'vendor'))
  or (select public.has_org_role(buyer_org_id, 'buyer'))
)
with check (
  (select public.is_platform_staff())
  or (select public.has_org_role(vendor_org_id, 'vendor'))
  or (select public.has_org_role(buyer_org_id, 'buyer'))
);

-- invoice_documents: lenders have no access to raw files
drop policy if exists documents_select on public.invoice_documents;
create policy documents_select on public.invoice_documents
for select to authenticated
using (
  exists (
    select 1 from public.invoices i
    where i.id = invoice_id
      and (
        (select public.is_platform_staff())
        or (select public.has_org_role(i.vendor_org_id, 'vendor'))
        or (select public.has_org_role(i.buyer_org_id, 'buyer'))
      )
  )
);

drop policy if exists documents_insert on public.invoice_documents;
create policy documents_insert on public.invoice_documents
for insert to authenticated
with check (
  uploaded_by = (select auth.uid())
  and exists (
    select 1 from public.invoices i
    where i.id = invoice_id
      and (select public.has_org_role(i.vendor_org_id, 'vendor'))
  )
);

drop policy if exists documents_update on public.invoice_documents;
create policy documents_update on public.invoice_documents
for update to authenticated
using (
  exists (
    select 1 from public.invoices i
    where i.id = invoice_id
      and (
        (select public.is_platform_staff())
        or (select public.has_org_role(i.vendor_org_id, 'vendor'))
      )
  )
)
with check (
  exists (
    select 1 from public.invoices i
    where i.id = invoice_id
      and (
        (select public.is_platform_staff())
        or (select public.has_org_role(i.vendor_org_id, 'vendor'))
      )
  )
);

-- buyer confirmations
drop policy if exists buyer_conf_select on public.buyer_confirmations;
create policy buyer_conf_select on public.buyer_confirmations
for select to authenticated
using (
  (select public.is_platform_staff())
  or (select public.has_org_role(buyer_org_id, 'buyer'))
  or exists (
    select 1 from public.invoices i
    where i.id = invoice_id
      and (select public.has_org_role(i.vendor_org_id, 'vendor'))
  )
  or exists (
    select 1 from public.invoices i
    where i.id = invoice_id
      and i.status in ('eligible_for_funding', 'partially_funded', 'funded', 'repaid')
      and exists (
        select 1 from public.organization_members m
        where m.user_id = (select auth.uid()) and m.role = 'lender'
      )
  )
);

drop policy if exists buyer_conf_insert on public.buyer_confirmations;
create policy buyer_conf_insert on public.buyer_confirmations
for insert to authenticated
with check (
  decided_by = (select auth.uid())
  and (select public.has_org_role(buyer_org_id, 'buyer'))
);

-- risk assessments: lenders see score/band/codes only via select of non-sensitive columns (all columns here are display-safe)
drop policy if exists risk_select on public.risk_assessments;
create policy risk_select on public.risk_assessments
for select to authenticated
using (
  (select public.is_platform_staff())
  or exists (
    select 1 from public.invoices i
    where i.id = invoice_id
      and (
        (select public.has_org_role(i.vendor_org_id, 'vendor'))
        or (select public.has_org_role(i.buyer_org_id, 'buyer'))
        or (
          i.status in ('eligible_for_funding', 'partially_funded', 'funded', 'repaid')
          and exists (
            select 1 from public.organization_members m
            where m.user_id = (select auth.uid()) and m.role = 'lender'
          )
        )
      )
  )
);

drop policy if exists risk_insert on public.risk_assessments;
create policy risk_insert on public.risk_assessments
for insert to authenticated
with check ((select public.is_platform_staff()));

drop policy if exists risk_update on public.risk_assessments;
create policy risk_update on public.risk_assessments
for update to authenticated
using ((select public.is_risk_officer()) or (select public.is_admin()))
with check ((select public.is_risk_officer()) or (select public.is_admin()));

-- funding opportunities
drop policy if exists funding_opp_select on public.funding_opportunities;
create policy funding_opp_select on public.funding_opportunities
for select to authenticated
using (
  (select public.is_platform_staff())
  or exists (
    select 1 from public.invoices i
    where i.id = invoice_id
      and (select public.has_org_role(i.vendor_org_id, 'vendor'))
  )
  or exists (
    select 1 from public.organization_members m
    join public.organizations o on o.id = m.organization_id
    where m.user_id = (select auth.uid())
      and m.role = 'lender'
      and o.status = 'active'
  )
);

drop policy if exists funding_opp_insert on public.funding_opportunities;
create policy funding_opp_insert on public.funding_opportunities
for insert to authenticated
with check ((select public.is_platform_staff()));

drop policy if exists funding_opp_update on public.funding_opportunities;
create policy funding_opp_update on public.funding_opportunities
for update to authenticated
using ((select public.is_platform_staff()))
with check ((select public.is_platform_staff()));

-- funding commitments
drop policy if exists funding_cmt_select on public.funding_commitments;
create policy funding_cmt_select on public.funding_commitments
for select to authenticated
using (
  (select public.is_admin())
  or (select public.has_org_role(lender_org_id, 'lender'))
  or (select public.is_risk_officer())
  or exists (
    select 1
    from public.funding_opportunities o
    join public.invoices i on i.id = o.invoice_id
    where o.id = opportunity_id
      and (select public.has_org_role(i.vendor_org_id, 'vendor'))
  )
);

drop policy if exists funding_cmt_insert on public.funding_commitments;
create policy funding_cmt_insert on public.funding_commitments
for insert to authenticated
with check (
  created_by = (select auth.uid())
  and (select public.has_org_role(lender_org_id, 'lender'))
);

-- status history
drop policy if exists status_history_select on public.status_history;
create policy status_history_select on public.status_history
for select to authenticated
using (
  exists (
    select 1 from public.invoices i
    where i.id = invoice_id
  )
);

-- notifications
drop policy if exists notifications_select on public.notifications;
create policy notifications_select on public.notifications
for select to authenticated
using (user_id = (select auth.uid()));

drop policy if exists notifications_update on public.notifications;
create policy notifications_update on public.notifications
for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

drop policy if exists notifications_insert on public.notifications;
create policy notifications_insert on public.notifications
for insert to authenticated
with check ((select public.is_platform_staff()) or user_id = (select auth.uid()));

-- audit logs: staff read only; writes via triggers
drop policy if exists audit_select on public.audit_logs;
create policy audit_select on public.audit_logs
for select to authenticated
using ((select public.is_platform_staff()));
