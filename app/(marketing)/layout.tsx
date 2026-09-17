"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu } from "lucide-react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";

export function MarketingHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="border-b border-border bg-card">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 md:px-6">
        <Logo />
        <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
          <Link href="/how-it-works" className="hover:text-foreground">
            Cara kerja
          </Link>
          <Link href="/about" className="hover:text-foreground">
            Tentang
          </Link>
          <Link href="/sign-in" className="hover:text-foreground">
            Masuk
          </Link>
          <Button asChild size="sm">
            <Link href="/sign-up">Daftar</Link>
          </Button>
        </nav>
        <Button
          variant="ghost"
          size="icon-sm"
          className="md:hidden"
          aria-label="Menu"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <Menu className="size-4" />
        </Button>
      </div>
      {open ? (
        <nav className="flex flex-col gap-1 border-t border-border px-4 py-3 text-sm md:hidden">
          <Link href="/how-it-works" className="rounded-lg px-2 py-2 hover:bg-muted" onClick={() => setOpen(false)}>
            Cara kerja
          </Link>
          <Link href="/about" className="rounded-lg px-2 py-2 hover:bg-muted" onClick={() => setOpen(false)}>
            Tentang
          </Link>
          <Link href="/sign-in" className="rounded-lg px-2 py-2 hover:bg-muted" onClick={() => setOpen(false)}>
            Masuk
          </Link>
          <Button asChild className="mt-1">
            <Link href="/sign-up">Daftar</Link>
          </Button>
        </nav>
      ) : null}
    </header>
  );
}

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <MarketingHeader />
      {children}
      <footer className="border-t border-border px-4 py-6 text-xs text-muted-foreground md:px-6">
        <div className="mx-auto max-w-6xl">
          InvoFin adalah platform perantara. Bukan pemberi pinjaman, tidak menjamin imbal hasil, dan
          belum mengklaim lisensi operasional.
        </div>
      </footer>
    </div>
  );
}
