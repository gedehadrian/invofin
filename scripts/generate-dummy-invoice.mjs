import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

function escapePdf(text) {
  return text.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

// Usage: node scripts/generate-dummy-invoice.mjs [invoiceNumber] [issueDate] [dueDate] [amountIdr] [outName]
const [
  invoiceNumber = "INV-DEMO-2026-001",
  issueDate = "2026-09-17",
  dueDate = "2026-10-17",
  amountIdr = "25,000,000.00",
  outName = "dummy-invoice.pdf",
] = process.argv.slice(2);

const lines = [
  [22, 800, "INVOICE"],
  [10, 778, "PT Sari Komponen"],
  [10, 764, "Jl. Gatot Subroto No. 12, Jakarta 12950"],
  [10, 750, "NPWP 10.0.1.3-012.000"],
  [12, 720, `Invoice Number: ${invoiceNumber}`],
  [12, 704, `Invoice Date: ${issueDate}`],
  [12, 688, `Due Date: ${dueDate}`],
  [12, 672, "Purchase Order: PO-7741"],
  [11, 640, "Bill To"],
  [11, 624, "PT Anchor Manufaktur"],
  [10, 610, "Jl. Sudirman Kav. 21, Jakarta 12190"],
  [11, 576, "Description"],
  [10, 558, "Supply of packaging materials - lot A"],
  [10, 542, "Quantity: 1"],
  [10, 526, `Unit Price: IDR ${amountIdr}`],
  [10, 510, `Amount: IDR ${amountIdr}`],
  [10, 478, `Subtotal: IDR ${amountIdr}`],
  [10, 462, "Tax: IDR 0.00"],
  [14, 438, `Invoice Total: IDR ${amountIdr}`],
  [10, 410, "Currency: IDR"],
  [10, 394, "Payment terms: Net 30"],
  [9, 360, "Dummy document for InvoFin Azure Document Intelligence test."],
];

let stream = "BT\n";
for (const [size, y, text] of lines) {
  stream += `/F1 ${size} Tf\n1 0 0 1 56 ${y} Tm\n(${escapePdf(text)}) Tj\n`;
}
stream += "ET\n";

const streamBytes = Buffer.byteLength(stream, "latin1");
const objects = [
  "<< /Type /Catalog /Pages 2 0 R >>",
  "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
  "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
  `<< /Length ${streamBytes} >>\nstream\n${stream}endstream`,
  "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
];

let pdf = "%PDF-1.4\n";
const offsets = [0];
for (let i = 0; i < objects.length; i++) {
  offsets.push(Buffer.byteLength(pdf, "latin1"));
  pdf += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`;
}
const xrefStart = Buffer.byteLength(pdf, "latin1");
pdf += `xref\n0 ${objects.length + 1}\n`;
pdf += "0000000000 65535 f \n";
for (let i = 1; i < offsets.length; i++) {
  pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
}
pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;

const out = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "demo", outName);
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, pdf, "latin1");
console.log(out);
