// next.config.ts - Next.js 15.5.2 için güncellenmiş
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  // Next.js 15'te serverComponentsExternalPackages kaldırıldı
  // Prisma otomatik olarak external olarak algılanıyor
};

export default nextConfig;
