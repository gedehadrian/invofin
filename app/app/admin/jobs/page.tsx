import { requireRole } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatDateTime } from "@/lib/format";
import { RetryDocumentJob } from "@/components/retry-document-job";
async function loadJobs() {
  const { data, error } = await createAdminClient()
    .from("document_jobs")
    .select("id,status,attempts,created_at,next_attempt_at,last_error_code")
    .order("created_at", { ascending: false })
    .limit(100);
  const jobs = data ?? [],
    failed = jobs.filter((x) => x.status === "failed").length,
    overdue = jobs.filter(
      (x) =>
        ["queued", "retry"].includes(x.status) &&
        Date.now() - Date.parse(x.next_attempt_at) > 300000,
    ).length;
  return { jobs, error, failed, overdue };
}
export default async function DocumentJobs() {
  await requireRole(["admin", "risk_officer"]);
  const { jobs, error, failed, overdue } = await loadJobs();
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-semibold">Operasional dokumen</h1>
      <p className="text-sm text-muted-foreground">
        100 pekerjaan terbaru · {failed} gagal · {overdue} menunggu lebih dari 5 menit.
        Retry hanya untuk pekerjaan gagal dan tercatat di audit.
      </p>
      {(error || failed > 0 || overdue > 0) && (
        <p role="alert" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
          {error
            ? "Antrean belum dapat dimuat."
            : "Ada pekerjaan yang perlu diperiksa operator."}
        </p>
      )}
      <div className="surface overflow-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr>
              {["Pekerjaan", "Status", "Percobaan", "Dibuat", "Tindakan"].map((x) => (
                <th className="p-3" key={x}>
                  {x}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {jobs.map((job) => (
              <tr className="border-t" key={job.id}>
                <td className="p-3">{job.id.slice(0, 8)}</td>
                <td className="p-3">
                  {job.status}
                  {job.last_error_code && (
                    <p className="text-xs text-muted-foreground">{job.last_error_code}</p>
                  )}
                </td>
                <td className="p-3">{job.attempts}</td>
                <td className="p-3">{formatDateTime(job.created_at)}</td>
                <td className="p-3">
                  {job.status === "failed" ? <RetryDocumentJob jobId={job.id} /> : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!jobs.length && (
          <p className="p-4 text-muted-foreground">Belum ada pekerjaan.</p>
        )}
      </div>
    </div>
  );
}
