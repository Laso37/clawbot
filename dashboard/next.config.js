/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  basePath: "",
  poweredByHeader: false,
  serverExternalPackages: ["ws"],
};

module.exports = nextConfig;
