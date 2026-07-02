// auth.ts — everything account-related lives in this one file.
// The rule of the house: rawg.ts talks to RAWG, supabase.ts owns the
// client, api.ts will own list data — and this file is the ONLY place
// that touches supabase.auth. If a login bug ever shows up, you know
// exactly which file to open.

import { supabase } from "./supabase";
import type { Session } from "@supabase/supabase-js";

// Create a brand-new account.
// Supabase stores the password (hashed, never in plain text) and, if
// email confirmation is turned off, logs the user in immediately.
export async function signUp(email: string, password: string): Promise<void> {
  const { error } = await supabase.auth.signUp({ email, password });

  // Fail loudly: supabase-js doesn't throw on failure, it hands back an
  // error object. We convert that into a real thrown Error so the form
  // can catch it and show the message to a human.
  if (error) {
    throw new Error(`Sign up failed: ${error.message}`);
  }
}

// Log in to an existing account with email + password.
export async function signIn(email: string, password: string): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    throw new Error(`Sign in failed: ${error.message}`);
  }
}

// Log out. Supabase clears the saved session from localStorage for us.
export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw new Error(`Sign out failed: ${error.message}`);
  }
}

// Change the logged-in user's password. Supabase doesn't ask for the
// old one — possessing a valid session IS the proof of who you are.
// (Same 6-character floor Supabase enforces at signup, checked here
// first so the form can say it in plain words.)
export async function changePassword(newPassword: string): Promise<void> {
  if (newPassword.length < 6) {
    throw new Error("Passwords need at least 6 characters.");
  }

  const { error } = await supabase.auth.updateUser({ password: newPassword });

  if (error) {
    throw new Error(`Couldn't change the password: ${error.message}`);
  }
}

// Watch for login/logout, and report changes to whoever asked.
//
// WHY this exists: the app needs to answer "is someone logged in RIGHT
// NOW?" at all times. Instead of us checking manually, Supabase lets us
// subscribe — it calls our function with the current session the moment
// we subscribe (so we learn the answer on page load), and again every
// time it changes (login, logout, token refresh).
//
// It returns a "stop watching" function, which React will want when the
// component unmounts — the same cleanup pattern as removeEventListener.
export function watchSession(
  onChange: (session: Session | null) => void
): () => void {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    // session is an object when logged in, null when logged out.
    onChange(session);
  });

  return () => data.subscription.unsubscribe();
}