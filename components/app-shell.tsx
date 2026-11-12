"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { Bell, CircleHelp, LogOut, Menu, Settings, Building2 } from "lucide-react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { signOutAction } from "@/app/actions/auth";
import type { MemberRole } from "@/lib/database.types";
import { cn } from "@/lib/utils";
import { roles, navigation, isNavActive } from "@/modules/workspace/config";

export function AppShell({ children, role, orgName, userName, unread, demo = false }: {
  children: React.ReactNode; role: MemberRole; orgName: string; userName: string; unread: number; demo?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const search = useSearchParams();
  const view = search.get("view") ?? "overview";
  const [mobileOpen, setMobileOpen] = useState(false);
  const items = navigation(role);

  function navLinks() {
    return (
      <nav aria-label="Navigasi utama" className="space-y-1">
        {items.map((item, index) => {
          const Icon = item.icon;
          const itemView = index === 0 ? "overview" : item.href.split("/").at(-1)!;
          const active = demo ? view === itemView : isNavActive(pathname, item.href, items);
          return (
            <Link
              key={item.href}
              href={demo ? `/demo?role=${role}&view=${itemView}` : item.href}
              onClick={() => setMobileOpen(false)}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                active && "bg-sidebar-accent text-primary hover:bg-sidebar-accent hover:text-primary",
              )}
            >
              <Icon className="size-[18px]" strokeWidth={1.8} />
              {item.label}
              {active && <span className="ml-auto size-1.5 rounded-full bg-primary" />}
            </Link>
          );
        })}
      </nav>
    );
  }

  const sidebar = (
    <>
      <div className="px-3 pb-6 pt-1">
        <Logo />
      </div>
      <div className="mb-6 flex items-center gap-2.5 rounded-xl border border-border bg-white/60 p-3">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-primary">
          <Building2 className="size-4" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold">{orgName}</p>
          <p className="mt-0.5 text-[11px] font-medium text-primary">{roles[role].label}</p>
        </div>
      </div>
      <p className="mb-2 px-3 text-[10px] font-semibold tracking-[.12em] text-muted-foreground">MENU UTAMA</p>
      {navLinks()}
      <div className="mt-auto space-y-1 border-t border-border pt-4">
        <Link
          href={demo ? `/demo?role=${role}&view=settings` : "/app/settings"}
          onClick={() => setMobileOpen(false)}
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <Settings className="size-[16px]" />
          Pengaturan
        </Link>
        <Link
          href="/how-it-works"
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <CircleHelp className="size-[16px]" />
          Contekan Cara Kerja
        </Link>
        {demo ? (
          <Link
            href="/sign-in"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium text-primary hover:bg-blue-50"
          >
            <LogOut className="size-[16px]" />
            Login Akun Asli
          </Link>
        ) : (
          <form action={signOutAction}>
            <button
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-xs text-muted-foreground hover:bg-red-50 hover:text-destructive"
              type="submit"
            >
              <LogOut className="size-[16px]" />
              Keluar
            </button>
          </form>
        )}
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen bg-background">
      <a
        href="#main-content"
        className="sr-only z-50 rounded bg-primary p-3 text-white focus:not-sr-only focus:fixed"
      >
        Lewati ke konten
      </a>
      <aside className="sticky top-0 hidden h-screen w-[236px] shrink-0 flex-col overflow-y-auto border-r border-border bg-sidebar px-4 py-6 lg:flex">
        {sidebar}
      </aside>
      <div className="min-w-0 flex-1">
        {demo && (
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 border-b border-blue-100 bg-blue-50 px-4 py-2 text-xs">
            <span className="font-medium text-primary">Mode Sandbox (Coba-coba bebas tanpa takut salah pencet)</span>
            <label className="flex items-center gap-2 text-muted-foreground">
              Ganti topi sebagai:{" "}
              <select
                aria-label="Peran demo"
                value={role}
                onChange={(event) => router.push(`/demo?role=${event.target.value}`)}
                className="rounded-md border border-blue-200 bg-white px-2.5 py-1 font-medium text-foreground"
              >
                {Object.entries(roles).map(([key, value]) => (
                  <option key={key} value={key}>
                    {value.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}
        <header className="flex h-16 items-center justify-between gap-3 border-b border-border bg-white px-5 sm:px-8">
          <div className="flex items-center gap-3">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Buka menu">
                  <Menu className="size-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="flex w-[260px] flex-col overflow-y-auto p-4">
                <SheetHeader className="sr-only">
                  <SheetTitle>Navigasi InvoFin</SheetTitle>
                </SheetHeader>
                {sidebar}
              </SheetContent>
            </Sheet>
            <span className="text-sm font-medium text-foreground">{roles[role].label}</span>
          </div>
          <div className="flex items-center gap-3">
            <Sheet>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative"
                  aria-label={`Notifikasi, ${unread} belum dibaca`}
                >
                  <Bell className="size-[18px]" />
                  {unread > 0 && <span className="absolute right-2 top-1.5 size-2 rounded-full bg-primary" />}
                </Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>Kabar Terbaru</SheetTitle>
                </SheetHeader>
                <div className="px-4 text-sm leading-relaxed text-muted-foreground">
                  {demo
                    ? "Lagi di mode demo nih! Kalau pakai akun beneran, semua update tagihanmu bakal nongol di sini."
                    : unread > 0
                      ? `Ada ${unread} kabar baru soal tagihanmu! Yuk cek daftar invoice atau antreanmu.`
                      : "Sepi nih, belum ada notif baru. Semua aman terkendali! ☕"}
                </div>
              </SheetContent>
            </Sheet>
            <div className="hidden h-6 w-px bg-border sm:block" />
            <div className="hidden text-right sm:block">
              <p className="text-xs font-semibold">{userName}</p>
              <p className="text-[11px] text-muted-foreground">{orgName}</p>
            </div>
            <span
              className="flex size-8 items-center justify-center rounded-full border border-blue-100 bg-blue-50 text-xs font-semibold text-primary"
              aria-hidden="true"
            >
              {userName
                .split(" ")
                .map((word) => word[0])
                .slice(0, 2)
                .join("")}
            </span>
          </div>
        </header>
        <main id="main-content" className="mx-auto max-w-6xl p-5 sm:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}

