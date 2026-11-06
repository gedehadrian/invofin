type RecoveryError = { status?: number; code?: string } | null;

/** Report transport/provider failures while keeping unknown accounts indistinguishable. */
export function recoveryResponse(error: RecoveryError): { error?: string; success?: string } {
  if (error?.status === 429) {
    return { error: "Terlalu banyak permintaan. Tunggu sebelum meminta tautan lagi." };
  }
  if (error && !["user_not_found", "email_not_found"].includes(error.code ?? "")) {
    return { error: "Layanan email pemulihan belum tersedia. Silakan coba kembali nanti." };
  }
  return {
    success: "Jika email terdaftar, tautan pemulihan akan dikirim. Buka tautan terbaru di browser ini dan periksa folder spam.",
  };
}
