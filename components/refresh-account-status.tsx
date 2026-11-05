"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function RefreshAccountStatus() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return <Button type="button" variant="ghost" disabled={pending} onClick={() => startTransition(() => router.refresh())}>{pending ? "Memeriksa..." : "Periksa status kembali"}</Button>;
}
