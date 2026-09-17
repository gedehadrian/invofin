"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signUpAction, type ActionState } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/logo";

const initial: ActionState = {};

export default function SignUpPage() {
  const [state, action, pending] = useActionState(signUpAction, initial);

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-10">
      <Logo />
      <h1 className="mt-8 text-2xl font-semibold">Buat akun organisasi</h1>
      <form action={action} className="mt-6 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="fullName">Nama lengkap</Label>
          <Input id="fullName" name="fullName" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Kata sandi</Label>
          <Input id="password" name="password" type="password" required minLength={8} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="organizationName">Nama organisasi</Label>
          <Input id="organizationName" name="organizationName" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="organizationType">Peran organisasi</Label>
          <select
            id="organizationType"
            name="organizationType"
            className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
            defaultValue="vendor"
          >
            <option value="vendor">Vendor</option>
            <option value="buyer">Anchor buyer</option>
            <option value="lender">Lender</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="sector">Sektor (opsional)</Label>
          <Input id="sector" name="sector" placeholder="Manufaktur, ritel, konstruksi" />
        </div>
        {state.error ? <p className="text-sm text-red-400">{state.error}</p> : null}
        {state.success ? <p className="text-sm text-teal-300">{state.success}</p> : null}
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Membuat akun..." : "Daftar"}
        </Button>
      </form>
      <p className="mt-4 text-sm text-slate-400">
        Sudah punya akun?{" "}
        <Link href="/sign-in" className="text-teal-300">
          Masuk
        </Link>
      </p>
    </main>
  );
}
