import Link from "next/link";
import { AuthShell } from "@/components/auth-shell";
import { SignInForm } from "@/components/account-forms";

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ password?: string; error?: string }> }) {
  const params = await searchParams;
  return <AuthShell title="Masuk ke InvoFin" description="Lanjutkan pengajuan dan pantau aktivitas organisasi Anda." footer={<>Belum punya akun? <Link href="/sign-up" className="font-medium text-primary">Daftar</Link></>}>
    {params.password === "updated" && <p role="status" className="mb-4 rounded-lg bg-primary/5 p-3 text-sm text-primary">Kata sandi berhasil diperbarui. Silakan masuk kembali.</p>}
    {params.error === "callback" && <p role="alert" className="mb-4 text-sm text-destructive">Tautan konfirmasi tidak dapat dipakai. Coba masuk atau minta tautan pemulihan baru.</p>}
    <SignInForm />
  </AuthShell>;
}
