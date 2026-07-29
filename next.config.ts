import type { NextConfig } from "next";

import packageJson from "./package.json";

const nextConfig: NextConfig = {
  transpilePackages: ["@mdxeditor/editor"],
  env: {
    NEXT_PUBLIC_APP_VERSION: packageJson.version,
  },
  async rewrites() {
    // `?raw` on a skill URL returns the markdown body (any client).
    return {
      beforeFiles: [
        {
          source: "/skills/:id",
          has: [{ type: "query", key: "raw" }],
          destination: "/api/skills/:id/markdown",
        },
      ],
    };
  },
};

export default nextConfig;
