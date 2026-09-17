-- Manual RLS checks. Run as two authenticated users from different vendor orgs.
-- Expected: user A cannot select invoices owned by vendor org B.

-- 1. Create two vendor users and orgs via Auth + seed, then:
-- select count(*) from invoices;  -- should only return the caller's vendor invoices
-- insert into invoices (...) using another vendor_org_id; -- should fail policy
-- select * from invoice_documents; -- lenders must receive 0 rows
-- select * from audit_logs; -- non-staff must fail

select 'rls_manual_suite' as suite;
