import Link from "next/link";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";

export function MarketingHeader() {
  return (
    <header className="flex items-center justify-between px-6 py-4">
      <Logo />
      <nav className="hidden items-center gap-6 text-sm text-slate-300 md:flex">
        <Link href="/how-it-works" className="hover:text-white">
          Cara kerja
        </Link>
        <Link href="/about" className="hover:text-white">
          Tentang
        </Link>
        <Link href="/sign-in" className="hover:text-white">
          Masuk
        </Link>
        <Button asChild>
          <Link href="/sign-up">Daftar</Link>
        </Button>
      </nav>
    </header>
  );
}

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(20,184,166,0.12),_transparent_45%),linear-gradient(180deg,#020617_0%,#0b1f3a_100%)]">
      <MarketingHeader />
      {children}
      <footer className="border-t border-white/5 px-6 py-8 text-xs text-slate-500">
        InvoFin adalah platform perantara. Bukan pemberi pinjaman, tidak menjamin imbal hasil, dan
        belum mengklaim lisensi operasional. Sumber angka proposal: Agustus 2026.
      </footer>
    </div>
  );
}
