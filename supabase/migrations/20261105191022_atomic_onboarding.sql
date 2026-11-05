-- Auth identity is verified in the server action. Only its trusted service client can enroll it.
create function public.complete_onboarding(p_actor uuid,p_full_name text,p_organization_name text,p_type text,p_sector text default null)
returns uuid language plpgsql set search_path='' as $$
declare organization_ref uuid;
begin
  if p_actor is null or p_type is null or p_type not in ('vendor','buyer','lender')
    or length(btrim(coalesce(p_full_name,''))) not between 3 and 100
    or length(btrim(coalesce(p_organization_name,''))) not between 2 and 160
    or length(coalesce(p_sector,''))>80 then raise exception 'INVALID_ONBOARDING'; end if;
  -- Serialize a user's retries without holding an external Auth request inside this transaction.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_actor::text,0));
  select organization_id into organization_ref from public.organization_members where user_id=p_actor
    order by is_primary desc,created_at,id limit 1;
  if found then return organization_ref; end if;
  -- FK to auth.users prevents enrollment of an invented identity.
  insert into public.profiles(id,full_name) values(p_actor,btrim(p_full_name))
    on conflict(id) do update set full_name=excluded.full_name;
  insert into public.organizations(name,type,sector,status)
    values(btrim(p_organization_name),p_type::public.organization_type,nullif(btrim(p_sector),''),'pending') returning id into organization_ref;
  insert into public.organization_members(organization_id,user_id,role,is_primary)
    values(organization_ref,p_actor,p_type::public.member_role,true);
  insert into public.audit_logs(actor_user_id,organization_id,action,entity_type,entity_id,after_data)
    values(p_actor,organization_ref,'organization_onboarded','organization',organization_ref,jsonb_build_object('status','pending','type',p_type));
  return organization_ref;
end;
$$;
revoke all on function public.complete_onboarding(uuid,text,text,text,text) from public,anon,authenticated;
grant execute on function public.complete_onboarding(uuid,text,text,text,text) to service_role;
