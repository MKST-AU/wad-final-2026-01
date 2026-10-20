import corsHeaders from "./src/lib/cors.js";
/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [{
      source: "/api/:path*",
      headers: Object.entries(corsHeaders).map(([key, value]) => ({ key, value })),
    }];
  },
};
export default nextConfig;
