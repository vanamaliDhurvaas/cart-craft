const path = require("node:path");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // yt-dlp is invoked via child_process; keep server runtime on Node (not edge).
  serverExternalPackages: ["@prisma/client"],
  // Pin the workspace root explicitly — without this, Turbopack's auto-detection
  // can walk up past this folder (e.g. to a parent lockfile) and pick the wrong
  // root, which triggers a "ignored package-lock.json" warning.
  turbopack: {
    root: __dirname
  }
};

module.exports = nextConfig;
