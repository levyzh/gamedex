/// <reference types="vite/client" />

// Declares the custom environment variables this app reads, so TypeScript knows
// import.meta.env.VITE_RAWG_KEY exists and is typed as a string.
interface ImportMetaEnv {
  readonly VITE_RAWG_KEY: string;
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_PUBLISHABLE_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
