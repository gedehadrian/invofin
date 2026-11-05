// The former writer reused one database across every Vercel environment.
// Keep this entry point fail-closed so old instructions cannot mix environments.
console.error("Legacy cross-environment configuration is disabled. See docs/OPERATIONS.md. The prototype-only configure-cloud-worker.mjs requires --apply.");
process.exitCode=1;
