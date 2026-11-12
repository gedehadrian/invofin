import Link from "next/link";
import { AuthShell } from "@/components/auth-shell";
import { SignInForm } from "@/components/account-forms";

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ password?: string; error?: string }> }) {
  const params = await searchParams;
  return (
    <AuthShell
      title="Selamat datang kembali! 👋"
      description="Masuk ke akunmu buat lanjut cek tagihan atau pantau pendanaan."
      footer={
        <>
          Belum punya akun?{" "}
          <Link href="/sign-up" className="font-medium text-primary">
            Daftar sekarang
          </Link>
        </>
      }
    >
      {params.password === "updated" && (
        <p role="status" className="mb-4 rounded-lg bg-primary/5 p-3 text-sm text-primary">
          Sip, kata sandi barumu sudah aktif! Silakan login.
        </p>
      )}
      {params.error === "callback" && (
        <p role="alert" className="mb-4 text-sm text-destructive">
          Wah, tautannya sudah kedaluwarsa. Coba login langsung atau minta tautan baru ya.
        </p>
      )}
      <SignInForm />
    </AuthShell>
  );
}

