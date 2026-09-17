import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/format";

export default async function AdminAuditPage() {
  await requireRole(["admin", "risk_officer"]);
  const supabase = await createClient();
  const { data } = await supabase
    .from("audit_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Audit trail</h1>
      <div className="overflow-auto rounded-xl border border-white/10">
        <table className="w-full text-sm">
          <thead className="bg-white/5 text-left text-slate-400">
            <tr>
              <th className="px-4 py-3">Waktu</th>
              <th className="px-4 py-3">Aksi</th>
              <th className="px-4 py-3">Entitas</th>
            </tr>
          </thead>
          <tbody>
            {(data ?? []).map((log) => (
              <tr key={log.id} className="border-t border-white/5">
                <td className="px-4 py-3">{formatDateTime(log.created_at)}</td>
                <td className="px-4 py-3">{log.action}</td>
                <td className="px-4 py-3">
                  {log.entity_type} {log.entity_id?.slice(0, 8)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
