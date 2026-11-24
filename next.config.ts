import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  /* config options here */
  turbopack: {
    root: path.resolve(__dirname),
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async redirects() {
    // Digital Signage page is switched off for now. Remove this redirect to bring it back.
    return [
      {
        source: "/solutions/digital-signage",
        destination: "/book",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
