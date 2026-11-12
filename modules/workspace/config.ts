import { Building2, FileCheck2, FileText, LayoutDashboard, ShieldCheck, Store, Users, Wallet, ScrollText } from "lucide-react";
import type { MemberRole } from "@/lib/database.types";

export const roles: Record<MemberRole, { label: string; title: string; description: string; home: string; action: string; actionHref: string }> = {
  vendor: {
    label: "Vendor UMKM",
    title: "Ringkasan usaha",
    description: "Jangan biarkan kas macet gara-gara nunggu jatuh tempo 90 hari. Cairkan tagihanmu di sini.",
    home: "/app/vendor",
    action: "Ajukan Invoice Baru",
    actionHref: "/app/vendor/invoices/new",
  },
  buyer: {
    label: "Anchor Buyer",
    title: "Ringkasan verifikasi",
    description: "Bantu vendor langgananmu bernapas lega. Cukup cek dan konfirmasi tagihan yang memang valid.",
    home: "/app/buyer",
    action: "Cek Tagihan Masuk",
    actionHref: "/app/buyer/approvals",
  },
  lender: {
    label: "Lender",
    title: "Ringkasan pendanaan",
    description: "Pilih tagihan usaha yang sudah diverifikasi berlapis dan pantau portofolio pendanaanmu.",
    home: "/app/lender",
    action: "Cari Peluang",
    actionHref: "/app/lender/marketplace",
  },
  risk_officer: {
    label: "Risk Officer",
    title: "Ringkasan risiko",
    description: "Mesin sudah bantu cek dokumen & anomali, tapi keputusan terakhir tetap di tanganmu.",
    home: "/app/risk",
    action: "Buka Antrean Review",
    actionHref: "/app/risk/queue",
  },
  admin: {
    label: "Administrator",
    title: "Ringkasan platform",
    description: "Kelola organisasi yang baru daftar, pantau antrean dokumen, dan jaga semuanya tetap rapi.",
    home: "/app/admin",
    action: "Kelola Organisasi",
    actionHref: "/app/admin/organizations",
  },
};

export function navigation(role: MemberRole) {
  const root = roles[role].home;
  const first = { href: root, label: "Dashboard", icon: LayoutDashboard };
  switch (role) {
    case "vendor":
      return [
        first,
        { href: `${root}/invoices/new`, label: "Buat Pengajuan", icon: Wallet },
        { href: `${root}/invoices`, label: "Daftar Invoice", icon: FileText },
      ];
    case "buyer":
      return [
        first,
        { href: `${root}/approvals`, label: "Butuh Konfirmasi", icon: FileCheck2 },
      ];
    case "lender":
      return [
        first,
        { href: `${root}/marketplace`, label: "Marketplace", icon: Store },
        { href: `${root}/portfolio`, label: "Portofolio Saya", icon: Wallet },
      ];
    case "risk_officer":
      return [
        first,
        { href: `${root}/queue`, label: "Antrean Review", icon: ShieldCheck },
        { href: "/app/admin/jobs", label: "Status OCR", icon: FileText },
        ...(process.env.NEXT_PUBLIC_APP_ENV !== "production"
          ? [{ href: `${root}/lab`, label: "Lab Simulasi", icon: ScrollText }]
          : []),
      ];
    case "admin":
      return [
        first,
        { href: `${root}/organizations`, label: "Approve Organisasi", icon: Building2 },
        { href: "/app/risk/queue", label: "Antrean Risiko", icon: ShieldCheck },
        { href: `${root}/jobs`, label: "Status OCR", icon: FileText },
        { href: `${root}/users`, label: "Daftar User", icon: Users },
        { href: `${root}/audit`, label: "Log Aktivitas", icon: ScrollText },
      ];
  }
}

export function isNavActive(path: string, href: string, items: { href: string }[]) {
  return path === href || (path.startsWith(`${href}/`) && !items.some(item => item.href !== href && item.href.startsWith(`${href}/`) && (path === item.href || path.startsWith(`${item.href}/`))));
}

