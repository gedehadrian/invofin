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

export function validateUpload(file: File) {
  if (!ALLOWED_MIME.has(file.type)) {
    throw new Error("Tipe berkas tidak diizinkan. Unggah PDF, JPG, PNG, atau WEBP.");
  }
  if (file.size <= 0 || file.size > MAX_BYTES) {
    throw new Error("Ukuran berkas harus antara 1 byte dan 10 MB.");
  }
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
