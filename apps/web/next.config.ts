import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  output: "standalone",
  productionBrowserSourceMaps: false,
  experimental: {
    serverSourceMaps: false,
  },
  outputFileTracingRoot: process.env.LOCAL_TURBOPACK_ROOT
    ? path.resolve(process.env.LOCAL_TURBOPACK_ROOT)
    : path.join(__dirname, "../../"),
  // Local checkouts may share installed dependencies with a sibling worktree.
  ...(process.env.LOCAL_TURBOPACK_ROOT
    ? { turbopack: { root: path.resolve(process.env.LOCAL_TURBOPACK_ROOT) } }
    : {}),
  serverExternalPackages: ["postgres"],
  allowedDevOrigins: ['192.168.68.100', '10.1.30.86', 'localhost'],
};

export default nextConfig;
