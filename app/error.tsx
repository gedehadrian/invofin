"use client";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex min-h-[50vh] flex-col items-center justify-center gap-3 px-6 text-center">
      <h1 className="text-xl font-semibold">Terjadi kesalahan</h1>
      <p className="max-w-md text-sm text-slate-400">{error.message}</p>
      <button className="text-teal-300 underline" type="button" onClick={reset}>
        Coba lagi
      </button>
    </main>
  );
}
