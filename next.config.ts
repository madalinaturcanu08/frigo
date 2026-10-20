import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  // The end-to-end tests build into their own folder so they never clash with `npm run dev`.
  distDir: process.env.NEXT_DIST_DIR || '.next',
  turbopack: {
    rules: {
      'globals.css': {
        loaders: ['@tailwindcss/turbopack'],
        as: '*.css',
      },
    },
  },
};

export default withNextIntl(nextConfig);
