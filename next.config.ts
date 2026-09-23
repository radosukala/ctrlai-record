import type { NextConfig } from 'next';

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
];

const config: NextConfig = {
  poweredByHeader: false,
  // PGlite loads its WebAssembly build from node_modules at runtime; bundling it breaks the asset paths.
  serverExternalPackages: ['@electric-sql/pglite'],
  // Share-card images read these fonts from disk at runtime; make sure serverless bundles include them.
  outputFileTracingIncludes: {
    '/**/*': [
      './node_modules/@fontsource/dm-sans/files/dm-sans-latin*-{400,600}-normal.woff',
      './node_modules/@fontsource/instrument-serif/files/instrument-serif-latin*-400-*.woff',
    ],
  },
  async redirects() {
    return [{ source: '/tomorrows', destination: '/', permanent: false }];
  },
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }];
  },
};

export default config;
