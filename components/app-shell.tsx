"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { Bell, CircleHelp, LogOut, Menu, Settings, ShieldCheck, ArrowUpRight, Building2 } from "lucide-react";
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
    return <nav aria-label="Navigasi utama" className="space-y-1">{items.map((item, index) => {
      const Icon = item.icon;
      const itemView = index === 0 ? "overview" : item.href.split("/").at(-1)!;
      const active = demo ? view === itemView : isNavActive(pathname, item.href, items);
      return <Link key={item.href} href={demo ? `/demo?role=${role}&view=${itemView}` : item.href} onClick={() => setMobileOpen(false)} aria-current={active ? "page" : undefined} className={cn("flex items-center gap-3 rounded-lg px-3 py-3 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground", active && "bg-sidebar-accent text-primary hover:bg-sidebar-accent hover:text-primary")}><Icon className="size-[18px]" strokeWidth={1.8} />{item.label}{active && <span className="ml-auto size-1.5 rounded-full bg-primary" />}</Link>;
    })}</nav>;
  }
  const sidebar = <>
    <div className="px-3 pb-8 pt-1"><Logo /></div>
    <div className="mb-7 flex items-center gap-2.5 rounded-xl border border-border p-3"><span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted"><Building2 className="size-4 text-muted-foreground" /></span><div className="min-w-0"><p className="truncate text-xs font-semibold">{orgName}</p><p className="mt-1 text-[10px] text-muted-foreground">{roles[role].label}</p></div></div>
    <p className="mb-3 px-3 text-[10px] font-semibold tracking-[.14em] text-muted-foreground">WORKSPACE</p>
    {navLinks()}
    <div className="mt-auto pt-12">
      <div className="mb-5 rounded-xl border border-blue-100 bg-blue-50/60 p-4"><ShieldCheck className="mb-2 size-5 text-primary" /><p className="text-xs font-semibold">Transaksi dengan tenang</p><p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">Pahami proses verifikasi dan pendanaan invoice Anda.</p><Link href="/how-it-works" className="mt-3 flex items-center gap-1 text-[11px] font-semibold text-primary">Pelajari alurnya <ArrowUpRight className="size-3" /></Link></div>
      <Link href={demo ? `/demo?role=${role}&view=settings` : "/app/settings"} onClick={() => setMobileOpen(false)} className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-xs text-muted-foreground hover:bg-muted"><Settings className="size-[17px]" />Pengaturan</Link>
      <Link href="/how-it-works" className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-xs text-muted-foreground hover:bg-muted"><CircleHelp className="size-[17px]" />Panduan penggunaan</Link>
      {demo ? <Link href="/sign-in" className="flex items-center gap-3 px-3 py-2.5 text-xs text-muted-foreground"><LogOut className="size-[17px]" />Masuk ke akun</Link> : <form action={signOutAction}><button className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-xs text-muted-foreground hover:bg-muted" type="submit"><LogOut className="size-[17px]" />Keluar</button></form>}
    </div>
  </>;
  return <div className="flex min-h-screen bg-background">
    <a href="#main-content" className="sr-only z-50 rounded bg-primary p-3 text-white focus:not-sr-only focus:fixed">Lewati ke konten</a>
    <aside className="sticky top-0 hidden h-screen w-[236px] shrink-0 flex-col overflow-y-auto border-r border-border bg-sidebar px-4 py-6 lg:flex">{sidebar}</aside>
    <div className="min-w-0 flex-1">
      {demo && <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 border-b border-blue-100 bg-blue-50 px-4 py-2 text-[11px]"><span className="font-medium text-primary">Mode demo · Data ilustrasi</span><label className="flex items-center gap-2 text-muted-foreground">Lihat sebagai <select aria-label="Peran demo" value={role} onChange={event => router.push(`/demo?role=${event.target.value}`)} className="rounded-md border border-blue-200 bg-white px-2 py-1 text-foreground">{Object.entries(roles).map(([key, value]) => <option key={key} value={key}>{value.label}</option>)}</select></label></div>}
      <header className="flex h-[76px] items-center justify-between gap-3 border-b border-border bg-white px-5 sm:px-8">
        <div className="flex items-center gap-3"><Sheet open={mobileOpen} onOpenChange={setMobileOpen}><SheetTrigger asChild><Button variant="ghost" size="icon" className="lg:hidden" aria-label="Buka menu"><Menu className="size-5" /></Button></SheetTrigger><SheetContent side="left" className="flex w-[270px] flex-col overflow-y-auto p-4"><SheetHeader className="sr-only"><SheetTitle>Navigasi InvoFin</SheetTitle></SheetHeader>{sidebar}</SheetContent></Sheet><span className="text-sm text-muted-foreground">Workspace <span className="mx-2 text-border">/</span> <span className="font-medium text-foreground">{roles[role].label}</span></span></div>
        <div className="flex items-center gap-4"><Sheet><SheetTrigger asChild><Button variant="ghost" size="icon" className="relative" aria-label={`Notifikasi, ${unread} belum dibaca`}><Bell className="size-[19px]" />{unread > 0 && <span className="absolute right-2 top-1.5 size-1.5 rounded-full bg-primary" />}</Button></SheetTrigger><SheetContent><SheetHeader><SheetTitle>Notifikasi</SheetTitle></SheetHeader><div className="px-4 text-sm text-muted-foreground">{demo ? "Ini adalah preview. Notifikasi akun asli tersedia setelah masuk." : unread > 0 ? `Ada ${unread} pemberitahuan belum dibaca. Periksa invoice dan antrean Anda untuk tindak lanjut.` : "Anda sudah mengikuti semua pembaruan."}</div></SheetContent></Sheet><div className="hidden h-7 w-px bg-border sm:block" /><div className="hidden text-right sm:block"><p className="text-xs font-semibold">{userName}</p><p className="mt-1 text-[10px] text-muted-foreground">{roles[role].label}</p></div><span className="flex size-9 items-center justify-center rounded-full border border-blue-100 bg-blue-50 text-xs font-semibold text-primary" aria-hidden="true">{userName.split(" ").map(word => word[0]).slice(0, 2).join("")}</span></div>
      </header>
      <main id="main-content" className="mx-auto max-w-[1600px] p-5 sm:p-8">{children}</main>
    </div>
  </div>;
}
