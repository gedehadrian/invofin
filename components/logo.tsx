import Link from "next/link";
import { ChartNoAxesCombined } from "lucide-react";
import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return <Link href="/" aria-label="InvoFin beranda" className={cn("inline-flex items-center gap-2.5 font-semibold tracking-tight", className)}>
    <span className="flex size-9 items-center justify-center rounded-[11px] bg-primary text-white shadow-sm"><ChartNoAxesCombined className="size-5" strokeWidth={2.2} /></span>
    <span className="text-[21px] text-foreground">invo<span className="text-primary">fin.</span></span>
  </Link>;
}
