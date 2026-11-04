-- Human decisions and related records commit together, with locks and replay checks.
create function public.confirm_invoice_extraction(p_invoice_id uuid,p_actor uuid,p_vendor uuid,p_number text,p_issue date,p_due date,p_amount numeric)
returns boolean language plpgsql set search_path=public as $$
declare i public.invoices;
begin
  select * into i from public.invoices where id=p_invoice_id for update;
  if not found or i.vendor_org_id<>p_vendor or i.status<>'extraction_review' then raise exception 'NOT_IN_EXTRACTION_REVIEW'; end if;
  if not exists(select 1 from public.organization_members m join public.organizations o on o.id=m.organization_id where m.user_id=p_actor and m.organization_id=p_vendor and m.role='vendor' and o.status='active') then raise exception 'UNAUTHORIZED_VENDOR'; end if;
  if p_amount is null or p_amount<=0 or p_amount>1e12 or p_due<p_issue or length(btrim(p_number))<3 then raise exception 'INVALID_CONFIRMATION'; end if;
  if (select count(distinct document_type) from public.invoice_documents where invoice_id=i.id and document_type in ('invoice','purchase_order','bast'))<>3
    or exists(select 1 from public.invoice_documents where invoice_id=i.id and extraction_status in ('pending','processing')) then raise exception 'DOCUMENTS_NOT_READY'; end if;
  update public.invoices set invoice_number=p_number,issue_date=p_issue,due_date=p_due,amount=p_amount,status='buyer_review' where id=i.id;
  insert into public.audit_logs(actor_user_id,organization_id,action,entity_type,entity_id,before_data,after_data)
  values(p_actor,p_vendor,'vendor_confirmed_extraction','invoice',i.id,jsonb_build_object('number',i.invoice_number,'amount',i.amount,'issue_date',i.issue_date,'due_date',i.due_date),jsonb_build_object('number',p_number,'amount',p_amount,'issue_date',p_issue,'due_date',p_due,'attested',true));
  return true;
end;
$$;
revoke all on function public.confirm_invoice_extraction(uuid,uuid,uuid,text,date,date,numeric) from public,anon,authenticated;
grant execute on function public.confirm_invoice_extraction(uuid,uuid,uuid,text,date,date,numeric) to service_role;

create or replace function public.guard_extraction_submission()
returns trigger language plpgsql set search_path=public as $$
begin
  if current_user='authenticated' and new.status='buyer_review' then raise exception 'USE_CONFIRMATION_WORKFLOW'; end if;
  return new;
end;
$$;

create function public.decide_buyer_invoice(p_invoice uuid,p_actor uuid,p_buyer uuid,p_decision text,p_amount numeric,p_due date,p_note text,p_assessment jsonb)
returns boolean language plpgsql set search_path=public as $$
declare i public.invoices; c public.buyer_confirmations;
begin
  select * into i from public.invoices where id=p_invoice for update;
  if not found or i.buyer_org_id<>p_buyer then raise exception 'INVOICE_NOT_FOUND'; end if;
  if not exists(select 1 from public.organization_members m join public.organizations o on o.id=m.organization_id where m.user_id=p_actor and m.organization_id=p_buyer and m.role='buyer' and o.status='active') then raise exception 'UNAUTHORIZED_BUYER'; end if;
  if i.created_by=p_actor then raise exception 'MAKER_CHECKER_REQUIRED'; end if;
  if p_decision not in ('confirmed','disputed') then raise exception 'INVALID_DECISION'; end if;
  select * into c from public.buyer_confirmations where invoice_id=i.id;
  if found then
    if c.decision::text<>p_decision or c.decided_by<>p_actor or (p_decision='confirmed' and (c.confirmed_amount is distinct from p_amount or c.confirmed_due_date is distinct from p_due)) then raise exception 'DECISION_CONFLICT'; end if;
    if i.status<>'buyer_review' then return true; end if;
  elsif i.status<>'buyer_review' then raise exception 'NOT_IN_BUYER_REVIEW';
  end if;
  if p_decision='confirmed' and (p_amount is null or p_amount<=0 or p_amount>1e12 or p_due is null or p_due<i.issue_date or p_assessment is null) then raise exception 'INVALID_CONFIRMATION'; end if;
  if p_decision='disputed' and length(btrim(coalesce(p_note,'')))<8 then raise exception 'REASON_REQUIRED'; end if;
  if c.id is null then
    insert into public.buyer_confirmations(invoice_id,buyer_org_id,decision,confirmed_amount,confirmed_due_date,note,decided_by)
    values(i.id,p_buyer,p_decision::public.buyer_decision,p_amount,p_due,p_note,p_actor);
  end if;
  if p_decision='confirmed' then
    if not exists(select 1 from public.risk_assessments where invoice_id=i.id) then
      insert into public.risk_assessments(invoice_id,score,risk_band,reason_codes,anomaly_flags,assessment_method,requires_manual_review)
      values(i.id,(p_assessment->>'score')::int,(p_assessment->>'riskBand')::public.risk_band,p_assessment->'reasonCodes',p_assessment->'anomalyFlags',p_assessment->>'assessmentMethod',true);
    end if;
    update public.invoices set status='risk_review' where id=i.id;
  else update public.invoices set status='rejected' where id=i.id;
  end if;
  return true;
end;
$$;
revoke all on function public.decide_buyer_invoice(uuid,uuid,uuid,text,numeric,date,text,jsonb) from public,anon,authenticated;
grant execute on function public.decide_buyer_invoice(uuid,uuid,uuid,text,numeric,date,text,jsonb) to service_role;

create function public.decide_risk_invoice(p_invoice uuid,p_actor uuid,p_decision text,p_note text,p_target numeric,p_vendor_fee numeric,p_lender_return numeric)
returns boolean language plpgsql set search_path=public as $$
declare i public.invoices; r public.risk_assessments; c public.buyer_confirmations; deadline timestamptz;
begin
  select * into i from public.invoices where id=p_invoice for update;
  if not found then raise exception 'INVOICE_NOT_FOUND'; end if;
  if not exists(select 1 from public.organization_members m join public.organizations o on o.id=m.organization_id where m.user_id=p_actor and m.role in ('admin','risk_officer') and o.type='platform' and o.status='active') then raise exception 'UNAUTHORIZED_REVIEWER'; end if;
  select * into c from public.buyer_confirmations where invoice_id=i.id;
  if i.created_by=p_actor or c.decided_by=p_actor then raise exception 'MAKER_CHECKER_REQUIRED'; end if;
  select * into r from public.risk_assessments where invoice_id=i.id order by created_at desc limit 1 for update;
  if not found then raise exception 'ASSESSMENT_REQUIRED'; end if;
  if r.decision is not null then
    if r.decision::text=p_decision and r.reviewed_by=p_actor then return true; end if;
    raise exception 'DECISION_CONFLICT';
  end if;
  if i.status<>'risk_review' or c.decision<>'confirmed' then raise exception 'NOT_IN_RISK_REVIEW'; end if;
  if p_decision not in ('approved','rejected') or length(btrim(coalesce(p_note,'')))<8 then raise exception 'REASON_REQUIRED'; end if;
  if p_decision='approved' then
    deadline=least(now()+interval '14 days',(c.confirmed_due_date+1)::timestamptz);
    if deadline<=now() then raise exception 'INVOICE_EXPIRED'; end if;
    if p_target is null or p_target<>round(c.confirmed_amount*coalesce(i.requested_advance_percent,80)/100,2) or p_vendor_fee not between 0 and 3 or p_lender_return<0 or p_lender_return>p_vendor_fee then raise exception 'INVALID_PRICING'; end if;
    insert into public.funding_opportunities(invoice_id,target_amount,vendor_fee_percent,lender_return_percent,opens_at,closes_at,status)
    values(i.id,p_target,p_vendor_fee,p_lender_return,now(),deadline,'open');
  end if;
  update public.risk_assessments set decision=p_decision::public.risk_decision,decision_note=p_note,reviewed_by=p_actor,reviewed_at=now() where id=r.id;
  update public.invoices set status=case when p_decision='approved' then 'eligible_for_funding'::public.invoice_status else 'rejected'::public.invoice_status end where id=i.id;
  return true;
end;
$$;
revoke all on function public.decide_risk_invoice(uuid,uuid,text,text,numeric,numeric,numeric) from public,anon,authenticated;
grant execute on function public.decide_risk_invoice(uuid,uuid,text,text,numeric,numeric,numeric) to service_role;

create table public.funding_requests (
  actor uuid not null references public.profiles(id),request_id uuid not null,opportunity_id uuid not null references public.funding_opportunities(id),amount numeric(18,2) not null,
  commitment_id uuid references public.funding_commitments(id),created_at timestamptz not null default now(),primary key(actor,request_id)
);
alter table public.funding_requests enable row level security;
revoke all on public.funding_requests from public,anon,authenticated;
grant all on public.funding_requests to service_role;
revoke insert,update,delete on public.funding_commitments from authenticated;
revoke execute on function public.create_funding_commitment(uuid,numeric) from authenticated;

create function public.commit_funding_once(p_opportunity uuid,p_amount numeric,p_request uuid)
returns public.funding_commitments language plpgsql security definer set search_path=public as $$
declare actor_id uuid=auth.uid(); request_row public.funding_requests; result public.funding_commitments;
begin
  if actor_id is null or p_request is null or p_amount is null or p_amount<=0 or p_amount>1e12 or p_amount<>round(p_amount,2) then raise exception 'INVALID_REQUEST'; end if;
  insert into public.funding_requests(actor,request_id,opportunity_id,amount) values(actor_id,p_request,p_opportunity,p_amount) on conflict do nothing;
  select * into request_row from public.funding_requests where actor=actor_id and request_id=p_request for update;
  if request_row.opportunity_id<>p_opportunity or request_row.amount<>p_amount then raise exception 'IDEMPOTENCY_CONFLICT'; end if;
  if request_row.commitment_id is not null then select * into result from public.funding_commitments where id=request_row.commitment_id; return result; end if;
  result=public.create_funding_commitment(p_opportunity,p_amount);
  update public.funding_requests set commitment_id=result.id where actor=actor_id and request_id=p_request;
  return result;
end;
$$;
revoke all on function public.commit_funding_once(uuid,numeric,uuid) from public,anon;
grant execute on function public.commit_funding_once(uuid,numeric,uuid) to authenticated;

-- Pin the two legacy helper search paths identified by the local security advisor.
alter function public.set_updated_at() set search_path = public;
alter function public.current_user_id() set search_path = public;
