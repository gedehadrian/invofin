import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Unggahan dokumen lewat Server Action dibatasi 1MB secara bawaan, sedangkan
      // validateUpload() mengizinkan sampai 10MB. Beri ruang untuk overhead multipart.
      bodySizeLimit: "12mb",
    },
  },
};

export default nextConfig;
