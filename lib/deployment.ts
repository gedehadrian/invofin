/** Server policy: environment promotion never grants access to prototype data or enables real payments. */
export function deploymentPolicy(env: Record<string, string | undefined>) {
  const url = new URL(env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321"),
    local = ["127.0.0.1", "localhost", "[::1]"].includes(url.hostname);
  const mode =
    env.INVOFIN_DEPLOYMENT_ENV ??
    (env.NEXT_PUBLIC_APP_ENV === "production"
      ? "production"
      : local
        ? "local"
        : "staging");
  if (!["local", "staging", "production"].includes(mode))
    throw new Error("Invalid deployment environment.");
  if (!local && url.protocol !== "https:")
    throw new Error("Hosted database requires HTTPS.");
  if (mode === "production") {
    const ref = env.INVOFIN_PRODUCTION_PROJECT_REF;
    if (
      !ref ||
      !/^[a-z0-9]{20}$/.test(ref) ||
      ref === "skwwgjjgeativyevkkpl" ||
      url.hostname !== `${ref}.supabase.co`
    )
      throw new Error("Production requires a separate, explicit database target.");
    if (
      env.NEXT_PUBLIC_APP_ENV !== "production" ||
      env.INVOFIN_OCR_MODE !== "azure" ||
      (env.CRON_SECRET?.length ?? 0) < 32
    )
      throw new Error("Production configuration is incomplete.");
    const site = env.NEXT_PUBLIC_SITE_URL ? new URL(env.NEXT_PUBLIC_SITE_URL) : null;
    if (
      !env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      !env.SUPABASE_SERVICE_ROLE_KEY ||
      !env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT ||
      !env.AZURE_DOCUMENT_INTELLIGENCE_KEY ||
      site?.protocol !== "https:"
    )
      throw new Error("Production provider configuration is incomplete.");
  }
  return {
    mode,
    databaseHost: url.hostname,
    syntheticExperiments: mode !== "production",
    realPayments: false as const,
  };
}
