/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  experimental: {
    typedRoutes: false,
  },
  // Allow `@pdf-forge/shared` (TS source) to be transpiled by Next.
  transpilePackages: ['@pdf-forge/shared'],

  /**
   * - pdfjs-dist v4 conditionally requires `canvas` for Node-side rendering;
   *   alias it away in the browser bundle.
   * - `@pdf-forge/shared` uses NodeNext-style `.js` extension specifiers in
   *   its TypeScript source (required for ESM Node emit). Webpack 5's
   *   `extensionAlias` maps those back to the real `.ts` files when Next
   *   transpiles the package via `transpilePackages`.
   */
  webpack: (config, { isServer }) => {
    config.resolve = config.resolve ?? {};
    config.resolve.extensionAlias = {
      ...(config.resolve.extensionAlias ?? {}),
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
      '.mjs': ['.mts', '.mjs'],
    };
    if (!isServer) {
      config.resolve.alias = {
        ...(config.resolve.alias ?? {}),
        canvas: false,
      };
    }
    return config;
  },

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
      {
        // Cache the heavy pdf.js worker aggressively in dev/prod.
        source: '/pdfjs/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=604800, immutable' },
          { key: 'Content-Type', value: 'application/javascript' },
        ],
      },
    ];
  },
};

export default nextConfig;
