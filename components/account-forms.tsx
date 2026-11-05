"use client";

import { useActionState, type ComponentProps } from "react";
import Link from "next/link";
import { signInAction, signUpAction, completeOnboardingAction, resetPasswordAction, updatePasswordAction, type ActionState } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initial: ActionState = {};
function Field({ label, name, ...props }: ComponentProps<typeof Input> & { label: string; name: string }) {
  return <div className="space-y-2"><Label htmlFor={name}>{label}</Label><Input id={name} name={name} {...props} /></div>;
}
function Feedback({ state }: { state: ActionState }) {
  return <>{state.error && <p role="alert" className="text-sm text-destructive">{state.error}</p>}{state.success && <p role="status" className="rounded-lg bg-primary/5 p-3 text-sm leading-relaxed text-primary">{state.success}</p>}</>;
}
export function SignInForm() {
  const [state, action, pending] = useActionState(signInAction, initial);
  return <form action={action} className="space-y-4">
    <Field label="Email" name="email" type="email" required autoComplete="email" maxLength={254} />
    <Field label="Kata sandi" name="password" type="password" required autoComplete="current-password" />
    <div className="text-right"><Link className="text-sm font-medium text-primary hover:underline" href="/forgot-password">Lupa kata sandi?</Link></div>
    <Feedback state={state} /><Button type="submit" className="w-full" disabled={pending}>{pending ? "Memproses..." : "Masuk"}</Button>
  </form>;
}
export function SignUpForm() {
  const [state, action, pending] = useActionState(signUpAction, initial);
  return <form action={action} className="space-y-4">
    <Field label="Nama lengkap" name="fullName" required minLength={3} maxLength={100} autoComplete="name" />
    <Field label="Email" name="email" type="email" required maxLength={254} autoComplete="email" />
    <Field label="Kata sandi" name="password" type="password" required minLength={12} maxLength={72} autoComplete="new-password" aria-describedby="password-help" />
    <p id="password-help" className="text-xs text-muted-foreground">Minimal 12 karakter. Gunakan kata sandi unik yang mudah Anda ingat.</p>
    <Feedback state={state} /><Button type="submit" className="w-full" disabled={pending}>{pending ? "Membuat akun..." : "Buat akun"}</Button>
  </form>;
}
export function OnboardingForm({ defaultName }: { defaultName: string }) {
  const [state, action, pending] = useActionState(completeOnboardingAction, initial);
  return <form action={action} className="space-y-4">
    <Field label="Nama lengkap" name="fullName" required defaultValue={defaultName} minLength={3} maxLength={100} autoComplete="name" />
    <Field label="Nama organisasi" name="organizationName" required minLength={2} maxLength={160} autoComplete="organization" />
    <div className="space-y-2"><Label htmlFor="organizationType">Peran organisasi</Label><select id="organizationType" name="organizationType" defaultValue="vendor" className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"><option value="vendor">Vendor UMKM</option><option value="buyer">Anchor buyer</option><option value="lender">Lender</option></select></div>
    <Field label="Sektor (opsional)" name="sector" maxLength={80} placeholder="Manufaktur, ritel, konstruksi" />
    <p className="text-xs leading-relaxed text-muted-foreground">Admin akan memeriksa organisasi sebelum akses workspace diaktifkan.</p>
    <Feedback state={state} /><Button type="submit" className="w-full" disabled={pending}>{pending ? "Menyimpan..." : "Daftarkan organisasi"}</Button>
  </form>;
}
export function PasswordRequestForm() {
  const [state, action, pending] = useActionState(resetPasswordAction, initial);
  return <form action={action} className="space-y-4">
    <Field label="Email akun" name="email" type="email" required maxLength={254} autoComplete="email" />
    <Feedback state={state} /><Button type="submit" className="w-full" disabled={pending}>{pending ? "Mengirim..." : "Kirim tautan pemulihan"}</Button>
  </form>;
}
export function NewPasswordForm() {
  const [state, action, pending] = useActionState(updatePasswordAction, initial);
  return <form action={action} className="space-y-4">
    <Field label="Kata sandi baru" name="password" type="password" required minLength={12} maxLength={72} autoComplete="new-password" />
    <Field label="Ulangi kata sandi baru" name="confirmPassword" type="password" required minLength={12} maxLength={72} autoComplete="new-password" />
    <p className="text-xs text-muted-foreground">Minimal 12 karakter. Setelah tersimpan, masuk kembali dengan kata sandi baru.</p>
    <Feedback state={state} /><Button type="submit" className="w-full" disabled={pending}>{pending ? "Menyimpan..." : "Simpan kata sandi baru"}</Button>
  </form>;
}
