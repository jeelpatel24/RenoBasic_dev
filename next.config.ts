import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // firebase-admin uses native modules (grpc, etc.) that cannot be bundled
  // by webpack. Mark it as an external so Next.js loads it from node_modules
  // at runtime rather than trying to bundle it.
  serverExternalPackages: ["firebase-admin"],
};

export default nextConfig;
