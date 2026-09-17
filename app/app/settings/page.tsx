import { requireUser } from "@/lib/auth/session";

export default async function SettingsPage() {
  const ctx = await requireUser();
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Pengaturan</h1>
      <p className="text-sm text-slate-400">
        {ctx.profile.full_name} · {ctx.email} · organisasi {ctx.current.organizations.name} ({ctx.current.role})
      </p>
      <p className="text-sm text-slate-500">
        Reset kata sandi memakai tautan email Supabase Auth. Organisasi baru menunggu persetujuan Admin.
      </p>
    </div>
  );
}
