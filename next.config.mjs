/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "sports-phinf.pstatic.net" },
    ],
  },
};

export default nextConfig;
