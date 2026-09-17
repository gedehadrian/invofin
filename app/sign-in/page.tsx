"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signInAction, type ActionState } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/logo";

const initial: ActionState = {};

export default function SignInPage() {
  const [state, action, pending] = useActionState(signInAction, initial);

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <Logo />
      <h1 className="mt-8 text-2xl font-semibold">Masuk ke InvoFin</h1>
      <form action={action} className="mt-6 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" required autoComplete="email" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Kata sandi</Label>
          <Input id="password" name="password" type="password" required autoComplete="current-password" />
        </div>
        {state.error ? <p className="text-sm text-red-400">{state.error}</p> : null}
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Memproses..." : "Masuk"}
        </Button>
      </form>
      <p className="mt-4 text-sm text-slate-400">
        Belum punya akun?{" "}
        <Link href="/sign-up" className="text-teal-300">
          Daftar
        </Link>
      </p>
    </main>
  );
}
