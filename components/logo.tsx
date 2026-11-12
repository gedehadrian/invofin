import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  variant?: "full" | "icon";
  priority?: boolean;
}

export function Logo({
  className,
  variant = "full",
  priority = true,
}: LogoProps) {
  const isIconOnly = variant === "icon";

  return (
    <Link
      href="/"
      aria-label="InvoFin beranda"
      className={cn("inline-flex items-center transition-opacity hover:opacity-90", className)}
    >
      {isIconOnly ? (
        <Image
          src="/logo.png"
          alt="InvoFin"
          width={36}
          height={36}
          priority={priority}
          className="size-9 object-contain"
        />
      ) : (
        <Image
          src="/logo_teks.png"
          alt="InvoFin"
          width={130}
          height={45}
          priority={priority}
          className="h-9 w-auto max-w-[160px] object-contain"
        />
      )}
    </Link>
  );
}

