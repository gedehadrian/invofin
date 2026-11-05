/** Auth callbacks only return to this application's workspace or exact account-flow paths. */
export function safeWorkspaceRedirect(value: string | null, origin: string) {
  if (!value || !value.startsWith("/") || /[\\\u0000-\u0020\u007f]/.test(value)) return new URL("/app", origin);
  try {
    const target = new URL(value, origin);
    const accountPath = ["/onboarding", "/account-status", "/reset-password"].includes(target.pathname);
    if (target.origin !== origin || (!accountPath && target.pathname !== "/app" && !target.pathname.startsWith("/app/"))) return new URL("/app", origin);
    return target;
  } catch { return new URL("/app", origin); }
}
