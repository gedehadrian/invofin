import { spawnSync } from "node:child_process";

// Deliberately local-only. No cloud credentials, Vault secrets or object bytes are exported.
if (
  !["127.0.0.1", "localhost", "[::1]"].includes(
    new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname,
  )
)
  throw new Error("Restore rehearsal requires local Supabase.");
const container = "supabase_db_invofin",
  name = `invofin_restore_${Date.now()}`,
  dump = `/tmp/${name}.dump`;
function docker(args) {
  const result = spawnSync("docker", ["exec", container, ...args], {
    encoding: "utf8",
    windowsHide: true,
  });
  if (result.status !== 0) {
    const diagnostic =
      result.stderr
        .split("\n")
        .find((line) => line.includes("ERROR:"))
        ?.split("CONTEXT:")[0]
        .slice(0, 220) ?? "Inspect Docker locally.";
    throw new Error(`Local restore command failed: ${args[0]}. ${diagnostic}`);
  }
  return result.stdout.trim();
}
const snapshot =
  "select json_build_object('users',(select count(*) from auth.users),'organizations',(select count(*) from public.organizations),'invoices',(select count(*) from public.invoices),'documents',(select count(*) from public.invoice_documents),'audit',(select count(*) from public.audit_logs),'storage_metadata',(select count(*) from storage.objects),'policies',(select count(*) from pg_policies where schemaname='public'))::text";
let created = false;
try {
  const before = docker(["psql", "-U", "postgres", "-d", "postgres", "-Atc", snapshot]);
  docker([
    "pg_dump",
    "-U",
    "postgres",
    "-d",
    "postgres",
    "--format=custom",
    "--no-owner",
    "--no-privileges",
    "--schema=public",
    "--schema=auth",
    "--schema=storage",
    "-f",
    dump,
  ]);
  docker(["createdb", "-U", "postgres", name]);
  created = true;
  docker([
    "psql",
    "-U",
    "postgres",
    "-d",
    name,
    "-v",
    "ON_ERROR_STOP=1",
    "-c",
    'drop schema public; create schema extensions; create extension pgcrypto with schema extensions; create extension "uuid-ossp" with schema extensions;',
  ]);
  docker([
    "pg_restore",
    "-U",
    "postgres",
    "--dbname",
    name,
    "--no-owner",
    "--no-privileges",
    "--exit-on-error",
    dump,
  ]);
  const after = docker(["psql", "-U", "postgres", "-d", name, "-Atc", snapshot]);
  if (before !== after) throw new Error("Local restore row/policy counts differ.");
  console.log(
    JSON.stringify({
      verified: true,
      scope: "Local logical Auth/public/Storage metadata and RLS policies only",
      counts: JSON.parse(after),
      grantsRestored: false,
      objectBytesRestored: false,
      cloudRestoreTested: false,
    }),
  );
} finally {
  if (created) docker(["dropdb", "-U", "postgres", name]);
  docker(["rm", "-f", dump]);
}
