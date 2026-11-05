-- Byte hashes alone miss re-exported/scanned invoices. Identity is independent of file encoding.
-- Preserve punctuation in invoice numbers; normalize only case and whitespace.
create unique index invoices_business_identity_unique on public.invoices
  (vendor_org_id,buyer_org_id,(upper(regexp_replace(btrim(invoice_number),'[[:space:]]+','','g'))));
