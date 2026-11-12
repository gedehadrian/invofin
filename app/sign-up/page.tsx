import Link from "next/link";
import { AuthShell } from "@/components/auth-shell";
import { SignUpForm } from "@/components/account-forms";

export default function SignUpPage() {
  return (
    <AuthShell
      title="Bikin Akun InvoFin"
      description="Langkah 1 dari 2: Buat akunmu dulu, habis itu kita daftarkan nama perusahaanmu."
      footer={
        <>
          Sudah punya akun?{" "}
          <Link href="/sign-in" className="font-medium text-primary">
            Langsung masuk
          </Link>
        </>
      }
    >
      <SignUpForm />
    </AuthShell>
  );
}

