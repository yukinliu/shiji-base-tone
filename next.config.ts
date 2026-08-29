import type { NextConfig } from 'next';

const isGitHubPages = process.env.GITHUB_ACTIONS === 'true';

const nextConfig: NextConfig = {
  output: 'export',
  trailingSlash: true,
  turbopack: { root: process.cwd() },
  basePath: isGitHubPages ? '/shiji-base-tone' : '',
  assetPrefix: isGitHubPages ? '/shiji-base-tone/' : undefined,
  images: { unoptimized: true },
};

export default nextConfig;
