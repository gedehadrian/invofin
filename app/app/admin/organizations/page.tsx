import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { OrgStatusForm } from "./org-status-form";

export default async function AdminOrganizationsPage() {
  await requireRole(["admin"]);
  const supabase = await createClient();
  const { data } = await supabase
    .from("organizations")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Organisasi</h1>
      <div className="surface overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Nama</th>
              <th className="px-4 py-3">Tipe</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {(data ?? []).map((org) => (
              <tr key={org.id} className="border-t border-border">
                <td className="px-4 py-3">{org.name}</td>
                <td className="px-4 py-3">{org.type}</td>
                <td className="px-4 py-3">
                  <OrgStatusForm organizationId={org.id} status={org.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
