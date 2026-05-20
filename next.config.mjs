/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      { hostname: "cdn.myanimelist.net" },
      { hostname: "img.youtube.com" },
      { hostname: "i.ytimg.com" },
      { hostname: "images.unsplash.com" },
    ],
    qualities: [75, 90],
  },
}

export default nextConfig
