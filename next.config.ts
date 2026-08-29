import type { NextConfig } from 'next';

const usesGitHubProjectPath = process.env.GITHUB_ACTIONS === 'true'
  && (process.env.NEXT_PUBLIC_SITE_URL || '').includes('github.io');

const nextConfig: NextConfig = {
  output: 'export',
  trailingSlash: true,
  turbopack: { root: process.cwd() },
  basePath: usesGitHubProjectPath ? '/shiji-base-tone' : '',
  assetPrefix: usesGitHubProjectPath ? '/shiji-base-tone/' : undefined,
  images: { unoptimized: true },
};

export default nextConfig;
