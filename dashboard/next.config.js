/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  basePath: "/clawbot",
  poweredByHeader: false,
  serverExternalPackages: ["ws"],
};

module.exports = nextConfig;
