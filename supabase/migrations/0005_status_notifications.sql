-- Fix: notifikasi "invoice menunggu konfirmasi buyer" tidak pernah terkirim.
--
-- record_invoice_status_history() di 0002_functions.sql hanya memicu notifikasi saat
-- status berubah menjadi 'submitted'. Tidak ada kode aplikasi yang pernah menulis
-- status 'submitted': submitInvoice() memindahkan invoice dari 'draft' langsung ke
-- 'extraction_review' atau 'buyer_review'. Akibatnya buyer tidak pernah diberi tahu.
--
-- Migrasi ini hanya mengganti isi fungsi (create or replace) dan memasang ulang
-- trigger yang sama. Tidak ada perubahan enum, tabel, atau data. Aman dijalankan
-- berulang kali.

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

    -- 'submitted' dipertahankan untuk kompatibilitas data lama; alur nyata memakai 'buyer_review'.
    if new.status in ('submitted', 'buyer_review') then
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
