/** Auth callbacks may only return to this application's protected workspace. */
export function safeWorkspaceRedirect(value: string | null, origin: string) {
  if (!value || !value.startsWith("/app") || /[\\\u0000-\u0020\u007f]/.test(value)) return new URL("/app", origin);
  try {
    const target = new URL(value, origin);
    if (target.origin !== origin || (target.pathname !== "/app" && !target.pathname.startsWith("/app/"))) return new URL("/app", origin);
    return target;
  } catch { return new URL("/app", origin); }
}
