"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  Building2,
  FileText,
  LayoutDashboard,
  LogOut,
  ShieldAlert,
  Store,
  Wallet,
} from "lucide-react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { signOutAction } from "@/app/actions/auth";
import type { MemberRole } from "@/lib/database.types";
import { cn } from "@/lib/utils";

const NAV: Record<MemberRole, { href: string; label: string; icon: typeof LayoutDashboard }[]> = {
  vendor: [
    { href: "/app/vendor", label: "Dasbor", icon: LayoutDashboard },
    { href: "/app/vendor/invoices", label: "Invoice", icon: FileText },
    { href: "/app/vendor/invoices/new", label: "Ajukan baru", icon: Wallet },
  ],
  buyer: [
    { href: "/app/buyer", label: "Dasbor", icon: LayoutDashboard },
    { href: "/app/buyer/approvals", label: "Konfirmasi", icon: FileText },
  ],
  lender: [
    { href: "/app/lender", label: "Dasbor", icon: LayoutDashboard },
    { href: "/app/lender/marketplace", label: "Marketplace", icon: Store },
    { href: "/app/lender/portfolio", label: "Portofolio", icon: Wallet },
  ],
  risk_officer: [
    { href: "/app/risk", label: "Dasbor", icon: LayoutDashboard },
    { href: "/app/risk/queue", label: "Antrean risiko", icon: ShieldAlert },
  ],
  admin: [
    { href: "/app/admin", label: "Dasbor", icon: LayoutDashboard },
    { href: "/app/admin/organizations", label: "Organisasi", icon: Building2 },
    { href: "/app/admin/users", label: "Pengguna", icon: Bell },
    { href: "/app/admin/audit", label: "Audit", icon: FileText },
    { href: "/app/risk/queue", label: "Antrean risiko", icon: ShieldAlert },
  ],
};

export function AppShell({
  children,
  role,
  orgName,
  userName,
  unread,
}: {
  children: React.ReactNode;
  role: MemberRole;
  orgName: string;
  userName: string;
  unread: number;
}) {
  const pathname = usePathname();
  const items = NAV[role];

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100">
      <aside className="hidden w-64 shrink-0 border-r border-white/5 bg-slate-950/80 p-4 md:flex md:flex-col">
        <Logo />
        <p className="mt-6 text-[11px] tracking-widest text-slate-500 uppercase">
          {role.replace("_", " ")}
        </p>
        <nav className="mt-3 flex flex-1 flex-col gap-1">
          {items.map((item) => {
            const Icon = item.icon;
            const active =
              pathname === item.href ||
              (item.href !== "/app/vendor" &&
                item.href !== "/app/buyer" &&
                item.href !== "/app/lender" &&
                item.href !== "/app/risk" &&
                item.href !== "/app/admin" &&
                pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-white/5",
                  active && "bg-teal-500/10 text-teal-200",
                )}
              >
                <Icon className="size-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <form action={signOutAction}>
          <Button variant="ghost" className="w-full justify-start text-slate-400" type="submit">
            <LogOut className="size-4" />
            Keluar
          </Button>
        </form>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-white/5 px-4 py-3 md:px-8">
          <div>
            <p className="text-sm font-medium text-white">{orgName}</p>
            <p className="text-xs text-slate-400">{userName}</p>
          </div>
          <div className="flex items-center gap-3 text-sm text-slate-400">
            <span className="rounded-full bg-white/5 px-2 py-1">
              Notifikasi {unread}
            </span>
            <Link href="/app/settings" className="hover:text-white">
              Pengaturan
            </Link>
          </div>
        </header>
        <main className="flex-1 px-4 py-6 md:px-8">{children}</main>
      </div>
    </div>
  );
}
