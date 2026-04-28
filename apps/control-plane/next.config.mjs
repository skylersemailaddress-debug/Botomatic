/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    if (process.env.NODE_ENV !== "development") {
      return [];
    }

    return {
      beforeFiles: [
        {
          source: "/api/local-repo-dashboard",
          destination: "/api/local-repo-dashboard",
        },
        {
          source: "/api/local-repo-dashboard/:path*",
          destination: "/api/local-repo-dashboard/:path*",
        },
        {
          source: "/api/hybrid-ci",
          destination: "/api/hybrid-ci",
        },
        {
          source: "/api/hybrid-ci/:path*",
          destination: "/api/hybrid-ci/:path*",
        },
      ],
      afterFiles: [],
      fallback: [
        {
          source: "/api/:path*",
          destination: "http://localhost:3001/api/:path*",
        },
      ],
    };
  },
};

export default nextConfig;
