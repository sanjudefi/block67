/** @type {import('next').NextConfig} */
const nextConfig = {
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
