import Link from "next/link";
import { AuthShell } from "@/components/auth-shell";
import { SignUpForm } from "@/components/account-forms";

export default function SignUpPage() {
  return <AuthShell title="Buat akun InvoFin" description="Langkah 1 dari 2. Setelah akun dikonfirmasi, lengkapi organisasi Anda." footer={<>Sudah punya akun? <Link href="/sign-in" className="font-medium text-primary">Masuk</Link></>}><SignUpForm /></AuthShell>;
}
