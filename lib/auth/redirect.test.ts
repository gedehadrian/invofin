import { test } from "node:test";
import assert from "node:assert/strict";
import { safeWorkspaceRedirect } from "./redirect";

test("auth callbacks only redirect to workspace on the same origin", () => {
  const origin = "https://invofin.example";
  for (const unsafe of [null, "https://evil.example", "//evil.example", "/app/../../sign-in", "/application", "/app\\evil", "/app\n/evil", "/app/%2e%2e/%2e%2e/"]) {
    assert.equal(safeWorkspaceRedirect(unsafe, origin).href, `${origin}/app`);
  }
  assert.equal(safeWorkspaceRedirect("/app/vendor/invoices?status=draft", origin).href, `${origin}/app/vendor/invoices?status=draft`);
});
