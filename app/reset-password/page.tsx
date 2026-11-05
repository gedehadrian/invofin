import Link from "next/link";
import { AuthShell } from "@/components/auth-shell";
import { NewPasswordForm } from "@/components/account-forms";
import { getAuthenticatedUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";
export default async function ResetPasswordPage() {
  const user = await getAuthenticatedUser();
  return <AuthShell title={user ? "Buat kata sandi baru" : "Tautan pemulihan diperlukan"} description={user ? "Pilih kata sandi unik untuk melindungi akun Anda." : "Sesi pemulihan belum tersedia atau telah berakhir."} footer={<Link href="/sign-in" className="font-medium text-primary">Kembali ke halaman masuk</Link>}>
    {user ? <NewPasswordForm /> : <Link href="/forgot-password" className="font-medium text-primary">Minta tautan pemulihan baru</Link>}
  </AuthShell>;
}
