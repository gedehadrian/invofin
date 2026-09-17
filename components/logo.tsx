import Link from "next/link";
import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <Link href="/" className={cn("flex items-center gap-2 font-semibold tracking-tight", className)}>
      <span className="flex size-8 items-center justify-center rounded-lg bg-teal-500 text-sm text-slate-950">
        IF
      </span>
      <span>
        Invo<span className="text-teal-400">Fin</span>
      </span>
    </Link>
  );
}
