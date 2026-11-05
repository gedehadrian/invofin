import "server-only";

/** Email links use explicit per-environment configuration, never an untrusted Host header. */
export function siteOrigin() {
  const value = process.env.NEXT_PUBLIC_SITE_URL ?? (process.env.NODE_ENV === "production" ? "" : "http://localhost:3000");
  const target = new URL(value);
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(target.hostname);
  if (target.username || target.password || target.pathname !== "/" || target.search || target.hash || (target.protocol !== "https:" && !(local && target.protocol === "http:"))) throw new Error("Invalid site origin configuration.");
  return target.origin;
}
