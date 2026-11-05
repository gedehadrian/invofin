import type { ReactNode } from "react";
import { Logo } from "@/components/logo";

export function AuthShell({ title, description, children, footer }: { title: string; description?: string; children: ReactNode; footer?: ReactNode }) {
  return <main className="mx-auto flex min-h-screen w-full max-w-lg flex-col justify-center px-5 py-12">
    <Logo />
    <h1 className="mt-8 text-2xl font-semibold tracking-tight">{title}</h1>
    {description && <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>}
    <div className="surface mt-6 p-6">{children}</div>
    {footer && <div className="mt-5 text-sm text-muted-foreground">{footer}</div>}
  </main>;
}
