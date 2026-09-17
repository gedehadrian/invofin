import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function KpiCard({
  label,
  value,
  hint,
  className,
}: {
  label: string;
  value: string;
  hint?: string;
  className?: string;
}) {
  return (
    <Card className={cn("border-white/5 bg-slate-900/70", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-medium tracking-wide text-slate-400 uppercase">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold tracking-tight text-white">{value}</p>
        {hint ? <p className="mt-1 text-xs text-slate-400">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}

export function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-dashed border-white/10 px-6 py-12 text-center">
      <p className="font-medium text-white">{title}</p>
      <p className="mt-1 text-sm text-slate-400">{description}</p>
    </div>
  );
}
