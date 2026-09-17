import Link from "next/link";
import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <Link href="/" className={cn("flex items-center gap-2 font-semibold tracking-tight", className)}>
      <span className="flex size-8 items-center justify-center rounded-xl bg-primary text-[13px] font-bold text-white">
        IF
      </span>
      <span className="text-[15px] text-foreground">
        Invo<span className="text-primary">Fin</span>
      </span>
    </Link>
  );
}
