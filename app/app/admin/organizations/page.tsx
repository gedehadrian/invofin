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
      <div>
        <h1 className="text-2xl font-semibold">Approve & Kelola Organisasi</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          User baru yang habis daftar bakal berstatus <strong>Menunggu (Pending)</strong>. Ubah ke <strong>Aktif</strong> biar mereka bisa langsung masuk ke workspace!
        </p>
      </div>
      <div className="surface overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Nama Organisasi</th>
              <th className="px-4 py-3 font-medium">Peran</th>
              <th className="px-4 py-3 font-medium">Status Akses</th>
            </tr>
          </thead>
          <tbody>
            {(data ?? []).map((org) => (
              <tr key={org.id} className="border-t border-border hover:bg-blue-50/30">
                <td className="px-4 py-3 font-medium">{org.name}</td>
                <td className="px-4 py-3 capitalize text-muted-foreground">{org.type}</td>
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

