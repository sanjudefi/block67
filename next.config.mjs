/** @type {import('next').NextConfig} */
const nextConfig = {
  // Ensure /site/[slug] is never cached by Vercel CDN or any intermediate proxy.
  // force-dynamic + unstable_noStore() handle Next.js RSC cache; these headers
  // handle the Vercel Edge Network and browser cache layers.
  async headers() {
    return [
      {
        source: "/site/:slug*",
        headers: [
          { key: "Cache-Control",        value: "no-store, no-cache, must-revalidate, max-age=0" },
          { key: "Vercel-CDN-Cache-Control", value: "no-store" },
          { key: "CDN-Cache-Control",    value: "no-store" },
          { key: "Pragma",               value: "no-cache" },
        ],
      },
    ];
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
      // Allow images served from any block67 subdomain
      { protocol: "https", hostname: "*.block67.app" },
    ],
  },
  // Ensure @openzeppelin .sol files are bundled with the /api/compile
  // serverless function so solc can read them at runtime via fs.readFileSync
  experimental: {
    outputFileTracingIncludes: {
      "/api/compile": [
        "./node_modules/@openzeppelin/contracts/**/*.sol",
        "./node_modules/@openzeppelin/contracts-upgradeable/**/*.sol",
      ],
    },
  },
  // Suppress solc/emscripten webpack warnings + stub missing optional deps
  // that ship inside @metamask/sdk (React Native) and pino (pino-pretty)
  webpack(config) {
    config.externals = [...(config.externals || []), { solc: "commonjs solc" }];

    // These packages are required by deep dependencies but don't exist in a
    // Next.js / browser build. Aliasing to false makes webpack emit an empty
    // module instead of failing the build.
    config.resolve.alias = {
      ...config.resolve.alias,
      "@react-native-async-storage/async-storage": false,
      "pino-pretty": false,
    };

    return config;
  },
};

export default nextConfig;
