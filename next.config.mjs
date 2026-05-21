/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      { hostname: "cdn.myanimelist.net" },
      { hostname: "img.youtube.com" },
      { hostname: "i.ytimg.com" },
      { hostname: "images.unsplash.com" },
      { hostname: "s4.anilist.co" },
      { hostname: "shikimori.one" },
    ],
    qualities: [75, 85, 90, 95],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
}

export default nextConfig
