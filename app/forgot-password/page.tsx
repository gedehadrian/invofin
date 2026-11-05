import Link from "next/link";
import { AuthShell } from "@/components/auth-shell";
import { PasswordRequestForm } from "@/components/account-forms";

export default async function ForgotPasswordPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const expired = (await searchParams).error === "expired";
  return <AuthShell title="Pulihkan kata sandi" description="Masukkan email akun untuk menerima tautan pemulihan." footer={<Link href="/sign-in" className="font-medium text-primary">Kembali ke halaman masuk</Link>}>
    {expired && <p role="alert" className="mb-4 text-sm text-destructive">Tautan tidak valid, sudah digunakan, atau kedaluwarsa. Minta tautan baru di bawah ini.</p>}
    <PasswordRequestForm />
  </AuthShell>;
}
