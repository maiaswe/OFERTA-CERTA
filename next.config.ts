import type { NextConfig } from "next";

const config: NextConfig = {
  poweredByHeader: false,
  devIndicators: false,
  serverExternalPackages: ["@electric-sql/pglite", "pg"],
  outputFileTracingIncludes: {
    "/ofertas": ["./db/certs/*.crt"],
    "/api/**": [
      "./db/migrations/*.sql",
      "./supabase/migrations/*.sql",
      "./db/certs/*.crt",
    ],
  },
  turbopack: {},
  // Use src/ directory for App Router (Next.js 13+)
  srcDir: 'src',
};

export default config;