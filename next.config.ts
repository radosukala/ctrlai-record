import type { NextConfig } from 'next';

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
];

/** Addresses from earlier versions of ctrlai.com (the public record and Other Tomorrows), sent somewhere useful. */
const RETIRED = [
  '/tomorrows', '/tomorrows/:path*', '/record', '/tests', '/tests/:path*', '/verify', '/questions', '/questions/:path*',
  '/data', '/log', '/me', '/signin', '/signin/:path*', '/r/:path*', '/ai/:path*',
];

const config: NextConfig = {
  poweredByHeader: false,
  // Thumbnails are copies in public/media (npm run measure), so nothing loads from YouTube or X until someone presses play.
  images: { localPatterns: [{ pathname: '/media/**', search: '' }] },
  // Share images read these fonts from disk at runtime; make sure serverless bundles include them.
  outputFileTracingIncludes: {
    '/**/*': [
      './node_modules/@fontsource/dm-sans/files/dm-sans-latin*-{400,600}-normal.woff',
      './node_modules/@fontsource/instrument-serif/files/instrument-serif-latin*-400-*.woff',
    ],
  },
  async redirects() {
    return [
      ...RETIRED.map(source => ({ source, destination: '/', permanent: false })),
      // The address printed on the film's videos: short enough to type.
      { source: '/film', destination: '/incident/openai-hugging-face/film', permanent: false },
      { source: '/library', destination: '/hall-of-fame', permanent: false },
      { source: '/library/:path*', destination: '/hall-of-fame', permanent: false },
    ];
  },
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }];
  },
};

export default config;
