/// <reference types="vite/client" />

// Declares the custom environment variables this app reads, so TypeScript knows
// e.g. import.meta.env.VITE_RAWG_KEY exists and is typed as a string.
interface ImportMetaEnv {
  readonly VITE_RAWG_KEY: string;
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_PUBLISHABLE_KEY: string;
  // Base URL of our Spring API (dev http://localhost:8080). Read by the shared
  // api-client and every migrated data file (comments, follows, list, feed).
  readonly VITE_API_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}