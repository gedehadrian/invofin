import { timingSafeEqual } from "node:crypto";
import { processNextDocumentJob } from "@/lib/documents/worker";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length < 32) return Response.json({ error: "WORKER_NOT_CONFIGURED" }, { status: 503 });
  const provided = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  const suppliedBytes = Buffer.from(provided);
  const expectedBytes = Buffer.from(expected);
  if (suppliedBytes.length !== expectedBytes.length || !timingSafeEqual(suppliedBytes, expectedBytes)) return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });
  try { return Response.json(await processNextDocumentJob(), { headers: { "Cache-Control": "no-store" } }); }
  catch { return Response.json({ error: "WORKER_UNAVAILABLE" }, { status: 503 }); }
}
export const GET = POST;
