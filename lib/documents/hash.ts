const ALLOWED_MIME = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const MAX_BYTES = 10 * 1024 * 1024;

export function sanitizeFilename(name: string) {
  const base = name.split(/[/\\]/).pop() ?? "document";
  return base.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120) || "document";
}

export async function validateUpload(file: File) {
  if (!ALLOWED_MIME.has(file.type)) {
    throw new Error("Tipe berkas tidak diizinkan. Unggah PDF, JPG, PNG, atau WEBP.");
  }
  if (file.size <= 0 || file.size > MAX_BYTES) {
    throw new Error("Ukuran berkas harus antara 1 byte dan 10 MB.");
  }
  const header = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const starts = (...signature: number[]) => signature.every((byte, index) => header[index] === byte);
  const valid = file.type === "application/pdf" ? starts(0x25, 0x50, 0x44, 0x46, 0x2d)
    : file.type === "image/png" ? starts(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)
    : file.type === "image/jpeg" ? starts(0xff, 0xd8, 0xff)
    : starts(0x52, 0x49, 0x46, 0x46) && [0x57, 0x45, 0x42, 0x50].every((byte, index) => header[index + 8] === byte);
  if (!valid) throw new Error("Isi berkas tidak sesuai dengan tipe dokumen yang dipilih.");
}

export async function sha256File(file: File) {
  const buffer = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return {
    hash: bufferToHex(digest),
    bytes: buffer,
  };
}

export function bufferToHex(buffer: ArrayBuffer) {
  return [...new Uint8Array(buffer)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
