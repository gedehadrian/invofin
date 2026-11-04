-- Trigger execution remains available to its owning database role; clients do not call these RPCs.
revoke all on function public.audit_buyer_confirmation() from public,anon,authenticated;
revoke all on function public.audit_funding_status() from public,anon,authenticated;
revoke all on function public.audit_risk_decision() from public,anon,authenticated;
revoke all on function public.handle_new_user() from public,anon,authenticated;
revoke all on function public.record_invoice_status_history() from public,anon,authenticated;
revoke all on function public.guard_invoice_mutation() from public,anon,authenticated;
revoke all on function public.guard_buyer_confirmation() from public,anon,authenticated;
revoke all on function public.guard_extraction_submission() from public,anon,authenticated;

-- These helpers are required by authenticated RLS policies. Anonymous callers have no use for them.
revoke all on function public.is_admin() from public,anon;
revoke all on function public.is_risk_officer() from public,anon;
revoke all on function public.is_platform_staff() from public,anon;
revoke all on function public.is_org_member(uuid) from public,anon;
revoke all on function public.has_org_role(uuid,public.member_role) from public,anon;
