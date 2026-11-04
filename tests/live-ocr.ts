/** Opt-in smoke test: sends only the repository's synthetic invoice to the configured Azure resource. */
import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
import { AzureDocumentIntelligenceProvider } from "../lib/documents/azure";

async function main() {
if (process.env.INVOFIN_LIVE_OCR !== "1") throw new Error("Set INVOFIN_LIVE_OCR=1 explicitly for an Azure API test.");
const provider = new AzureDocumentIntelligenceProvider();
if (!provider.isConfigured()) throw new Error("Azure is not configured.");
const bytes = await readFile("public/demo/dummy-invoice.pdf");
const result = await provider.extractInvoice({ bytes: bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), mimeType: "application/pdf", filename: "synthetic-test-invoice.pdf" });
// Never print raw provider response, endpoint, credentials or full document content.
console.log(JSON.stringify({ status: result.status, fieldsFound: Object.entries(result.fields).filter(([,v])=>v!=null).map(([key])=>key), reviewReasons: result.reviewReasons ?? [] }));
assert.notEqual(result.status, "failed", "Azure extraction failed; inspect resource configuration privately.");
assert.equal(result.fields.invoiceNumber, "INV-DEMO-2026-001");
assert.equal(result.fields.amount, 25000000);
}
main().catch(() => { console.error("Live OCR test failed. Check Azure configuration and extraction results privately."); process.exitCode=1; });
