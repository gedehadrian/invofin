import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
    ] }];
  },
  experimental: {
    serverActions: {
      // Unggahan dokumen lewat Server Action dibatasi 1MB secara bawaan, sedangkan
      // validateUpload() mengizinkan sampai 10MB. Beri ruang untuk overhead multipart.
      bodySizeLimit: "12mb",
    },
  },
};

export default nextConfig;
