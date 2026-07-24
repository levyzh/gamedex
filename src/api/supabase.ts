// All of Gamedex's talk with Supabase (auth + database) lives here — the same
// way rawg.ts holds every RAWG call. One place creates the client, so the URL
// and key are written once and the rest of the app just imports `supabase`.
import { createClient } from "@supabase/supabase-js";

// Vite only exposes VITE_-prefixed variables to the browser. Both of these are
// safe to ship in the frontend: the publishable key is designed to be public,
// and Row Level Security (not secrecy) is what actually protects your data.
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// Fail loudly in dev if either is missing, matching how rawg.ts guards its key.
if (!url || !key) {
  console.error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY — add them to your .env file.");
}

export const supabase = createClient(url, key);