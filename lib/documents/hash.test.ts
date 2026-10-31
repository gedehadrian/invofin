import { test } from "node:test";
import assert from "node:assert/strict";
import { validateUpload, sha256File, sanitizeFilename } from "./hash";

test("upload validation rejects mismatched content, empty, oversized and active content", async () => {
  await assert.rejects(validateUpload(new File(["<script>bad</script>"], "invoice.pdf", { type: "application/pdf" })));
  await assert.rejects(validateUpload(new File([], "empty.pdf", { type: "application/pdf" })));
  await assert.rejects(validateUpload(new File([new Uint8Array(10 * 1024 * 1024 + 1)], "large.pdf", { type: "application/pdf" })));
  await assert.rejects(validateUpload(new File(["<svg></svg>"], "invoice.svg", { type: "image/svg+xml" })));
});

test("supported signatures and stable fingerprints are accepted", async () => {
  const pdf = new File(["%PDF-1.7\nsynthetic fixture"], "invoice.pdf", { type: "application/pdf" });
  await validateUpload(pdf);
  await validateUpload(new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])], "invoice.png", { type: "image/png" }));
  assert.equal((await sha256File(pdf)).hash, (await sha256File(pdf)).hash);
  assert.equal(sanitizeFilename("../../invoice name.pdf"), "invoice_name.pdf");
});
