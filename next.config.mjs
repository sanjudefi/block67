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
  // Suppress solc/emscripten webpack warnings
  webpack(config) {
    config.externals = [...(config.externals || []), { solc: "commonjs solc" }];
    return config;
  },
};

export default nextConfig;
