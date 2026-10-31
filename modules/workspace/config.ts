import { Building2, FileCheck2, FileText, LayoutDashboard, ShieldCheck, Store, Users, Wallet, ScrollText } from "lucide-react";
import type { MemberRole } from "@/lib/database.types";

export const roles: Record<MemberRole, { label: string; title: string; description: string; home: string; action: string; actionHref: string }> = {
  vendor: { label: "Vendor UMKM", title: "Ringkasan usaha", description: "Satu tempat untuk invoice, pendanaan, dan langkah berikutnya.", home: "/app/vendor", action: "Ajukan invoice", actionHref: "/app/vendor/invoices/new" },
  buyer: { label: "Anchor Buyer", title: "Ringkasan verifikasi", description: "Jaga kelancaran rantai pasok dengan konfirmasi invoice yang tepat.", home: "/app/buyer", action: "Tinjau invoice", actionHref: "/app/buyer/approvals" },
  lender: { label: "Lender", title: "Ringkasan pendanaan", description: "Temukan peluang terverifikasi dan pantau komitmen pendanaan Anda.", home: "/app/lender", action: "Jelajahi marketplace", actionHref: "/app/lender/marketplace" },
  risk_officer: { label: "Risk Officer", title: "Ringkasan risiko", description: "Tinjau bukti, telusuri anomali, dan buat keputusan yang terukur.", home: "/app/risk", action: "Buka antrean", actionHref: "/app/risk/queue" },
  admin: { label: "Administrator", title: "Ringkasan platform", description: "Pantau aktivitas platform, organisasi, dan jejak audit.", home: "/app/admin", action: "Kelola organisasi", actionHref: "/app/admin/organizations" },
};

export function navigation(role: MemberRole) {
  const root = roles[role].home;
  const first = { href: root, label: "Ringkasan", icon: LayoutDashboard };
  switch (role) {
    case "vendor": return [first, { href: `${root}/invoices`, label: "Invoice saya", icon: FileText }, { href: `${root}/invoices/new`, label: "Pengajuan baru", icon: Wallet }];
    case "buyer": return [first, { href: `${root}/approvals`, label: "Konfirmasi invoice", icon: FileCheck2 }];
    case "lender": return [first, { href: `${root}/marketplace`, label: "Marketplace", icon: Store }, { href: `${root}/portfolio`, label: "Portofolio", icon: Wallet }];
    case "risk_officer": return [first, { href: `${root}/queue`, label: "Antrean tinjauan", icon: ShieldCheck }];
    case "admin": return [first, { href: `${root}/organizations`, label: "Organisasi", icon: Building2 }, { href: `${root}/users`, label: "Pengguna", icon: Users }, { href: `${root}/audit`, label: "Jejak audit", icon: ScrollText }, { href: "/app/risk/queue", label: "Antrean risiko", icon: ShieldCheck }];
  }
}

export function isNavActive(path: string, href: string, items: { href: string }[]) {
  return path === href || (path.startsWith(`${href}/`) && !items.some(item => item.href !== href && item.href.startsWith(`${href}/`) && (path === item.href || path.startsWith(`${item.href}/`))));
}
