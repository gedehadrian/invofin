import { createClient } from "@supabase/supabase-js";
import { deploymentPolicy } from "../lib/deployment";
import type { Database } from "../lib/database.types";
async function main() {
  const policy = deploymentPolicy(process.env),
    apply = process.argv.includes("--apply");
  const db = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const cutoff = new Date(Date.now() - 24 * 3600000).toISOString();
  const { data, error } = await db
    .from("document_uploads")
    .select("id,storage_path,vendor_org_id,invoice_id")
    .lt("expires_at", cutoff)
    .is("quarantine_purged_at", null)
    .order("expires_at")
    .limit(100);
  if (error) throw new Error("Retention query failed.");
  const rows = data ?? [],
    paths = rows
      .filter((row) =>
        row.storage_path.startsWith(`${row.vendor_org_id}/${row.invoice_id}/`),
      )
      .map((row) => row.storage_path);
  let removed = 0;
  if (apply && paths.length) {
    const result = await db.storage.from("invoice-uploads").remove(paths);
    if (result.error) throw new Error("Retention storage request failed.");
    removed = result.data?.length ?? 0;
    const ids = rows
      .filter((row) => paths.includes(row.storage_path))
      .map((row) => row.id);
    const marked = await db
      .from("document_uploads")
      .update({ quarantine_purged_at: new Date().toISOString() })
      .in("id", ids);
    if (marked.error)
      throw new Error(
        "Retention metadata update failed; storage removal can be retried safely.",
      );
  }
  console.log(
    JSON.stringify({
      mode: policy.mode,
      dryRun: !apply,
      candidates: paths.length,
      skippedInvalidPaths: rows.length - paths.length,
      removed,
      bucket: "invoice-uploads",
      scope: "Expired quarantine only; canonical documents and audit metadata retained",
    }),
  );
}
main().catch(() => {
  console.error("Retention failed; no document paths or credentials were logged.");
  process.exitCode = 1;
});
