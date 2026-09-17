"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  Building2,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  ShieldAlert,
  Store,
  Wallet,
} from "lucide-react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { signOutAction } from "@/app/actions/auth";
import type { MemberRole } from "@/lib/database.types";
import { cn } from "@/lib/utils";

const ROLE_LABEL: Record<MemberRole, string> = {
  vendor: "Vendor",
  buyer: "Buyer",
  lender: "Lender",
  risk_officer: "Risk",
  admin: "Admin",
};

const NAV: Record<MemberRole, { href: string; label: string; icon: typeof LayoutDashboard }[]> = {
  vendor: [
    { href: "/app/vendor", label: "Overview", icon: LayoutDashboard },
    { href: "/app/vendor/invoices", label: "Invoice", icon: FileText },
    { href: "/app/vendor/invoices/new", label: "Ajukan baru", icon: Wallet },
  ],
  buyer: [
    { href: "/app/buyer", label: "Overview", icon: LayoutDashboard },
    { href: "/app/buyer/approvals", label: "Konfirmasi", icon: FileText },
  ],
  lender: [
    { href: "/app/lender", label: "Overview", icon: LayoutDashboard },
    { href: "/app/lender/marketplace", label: "Marketplace", icon: Store },
    { href: "/app/lender/portfolio", label: "Portofolio", icon: Wallet },
  ],
  risk_officer: [
    { href: "/app/risk", label: "Overview", icon: LayoutDashboard },
    { href: "/app/risk/queue", label: "Antrean", icon: ShieldAlert },
  ],
  admin: [
    { href: "/app/admin", label: "Overview", icon: LayoutDashboard },
    { href: "/app/admin/organizations", label: "Organisasi", icon: Building2 },
    { href: "/app/admin/users", label: "Pengguna", icon: Bell },
    { href: "/app/admin/audit", label: "Audit", icon: FileText },
    { href: "/app/risk/queue", label: "Antrean", icon: ShieldAlert },
  ],
};

function isActive(pathname: string, href: string) {
  const roots = ["/app/vendor", "/app/buyer", "/app/lender", "/app/risk", "/app/admin"];
  if (roots.includes(href)) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLinks({
  items,
  pathname,
  onNavigate,
}: {
  items: { href: string; label: string; icon: typeof LayoutDashboard }[];
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <nav className="flex flex-col gap-1">
      {items.map((item) => {
        const Icon = item.icon;
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
              active && "bg-sidebar-accent text-primary",
            )}
          >
            <Icon className="size-4 shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

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
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-[220px] shrink-0 flex-col border-r border-sidebar-border bg-sidebar px-4 py-5 md:flex">
        <Logo />
        <p className="mt-6 mb-2 px-3 text-[11px] font-medium tracking-wide text-[#c7c7c7] uppercase">
          {ROLE_LABEL[role]}
        </p>
        <div className="flex-1">
          <NavLinks items={items} pathname={pathname} />
        </div>
        <form action={signOutAction}>
          <Button variant="ghost" className="w-full justify-start text-muted-foreground" type="submit">
            <LogOut className="size-4" />
            Keluar
          </Button>
        </form>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-3 border-b border-border bg-card px-4 py-3 md:px-7">
          <div className="flex min-w-0 items-center gap-2">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon-sm" className="md:hidden" aria-label="Menu">
                  <Menu className="size-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-4">
                <SheetHeader className="px-0">
                  <SheetTitle>
                    <Logo />
                  </SheetTitle>
                </SheetHeader>
                <p className="mt-2 mb-3 px-3 text-[11px] font-medium tracking-wide text-[#c7c7c7] uppercase">
                  {ROLE_LABEL[role]}
                </p>
                <NavLinks items={items} pathname={pathname} />
                <form action={signOutAction} className="mt-6">
                  <Button variant="ghost" className="w-full justify-start" type="submit">
                    <LogOut className="size-4" />
                    Keluar
                  </Button>
                </form>
              </SheetContent>
            </Sheet>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">{orgName}</p>
              <p className="truncate text-xs text-muted-foreground">{userName}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="hidden rounded-full bg-muted px-2.5 py-1 sm:inline">
              {unread} notifikasi
            </span>
            <Button variant="ghost" size="icon-sm" asChild aria-label="Pengaturan">
              <Link href="/app/settings">
                <Settings className="size-4" />
              </Link>
            </Button>
          </div>
        </header>
        <main className="flex-1 px-4 py-5 md:px-7 md:py-6">{children}</main>
      </div>
    </div>
  );
}
