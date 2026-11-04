"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Clock3 } from "lucide-react";

export function ExtractionProgress({ processing }: { processing: boolean }) {
  const router = useRouter();
  useEffect(() => {
    if (!processing) return;
    const timer = setInterval(() => { if (document.visibilityState === "visible") router.refresh(); }, 5000);
    return () => clearInterval(timer);
  }, [processing, router]);
  if (!processing) return null;
  return <p role="status" className="mt-3 flex items-start gap-2 rounded-lg bg-blue-50 p-3 text-xs leading-relaxed text-primary"><Clock3 className="size-4 shrink-0" />Dokumen sedang antre atau diproses. Status diperbarui otomatis. Anda dapat kembali ke halaman ini nanti.</p>;
}
