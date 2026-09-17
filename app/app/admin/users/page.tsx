import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export default async function AdminUsersPage() {
  await requireRole(["admin"]);
  const supabase = await createClient();
  const { data } = await supabase
    .from("organization_members")
    .select("id, role, is_primary, profiles(full_name), organizations(name, type)")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Pengguna</h1>
      <ul className="space-y-2 text-sm">
        {(data ?? []).map((row) => {
          const profile = row.profiles as { full_name?: string } | null;
          const org = row.organizations as { name?: string; type?: string } | null;
          return (
            <li key={row.id} className="surface px-4 py-3">
              {profile?.full_name ?? "User"} · {row.role} · {org?.name} ({org?.type})
            </li>
          );
        })}
      </ul>
    </div>
  );
}
