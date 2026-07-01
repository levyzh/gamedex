// AuthForm.tsx — the screen you see when you're logged out.
// One form, two jobs: it can either sign you up or sign you in,
// depending on which mode the user has toggled.
//
// Notice what's MISSING: no callback prop like onLoginSuccess. We don't
// need one. When signIn succeeds, Supabase fires the auth change event,
// watchSession in App.tsx hears it, App re-renders, and this form
// disappears on its own. The subscription is the messenger.

import { useState } from "react";
import { signIn, signUp } from "./auth";

export function AuthForm() {
  // Which job is the form doing right now?
  const [mode, setMode] = useState<"signin" | "signup">("signin");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // For telling the human what went wrong ("Invalid login credentials"),
  // and for disabling the button while we wait on the network.
  const [errorMessage, setErrorMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit() {
    setErrorMessage("");
    setBusy(true);

    try {
      if (mode === "signup") {
        await signUp(email, password);
      } else {
        await signIn(email, password);
      }
      // No redirect code here — see the note at the top of the file.
    } catch (err) {
      // Our auth.ts functions throw real Errors with readable messages,
      // so we can show the message directly to the user.
      setErrorMessage(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-form">
      <h2>{mode === "signin" ? "Log in" : "Create an account"}</h2>

      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <input
        type="password"
        placeholder="Password (6+ characters)"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      <button onClick={handleSubmit} disabled={busy}>
        {busy ? "Working..." : mode === "signin" ? "Log in" : "Sign up"}
      </button>

      {/* Only render the error paragraph if there IS an error. */}
      {errorMessage && <p className="auth-error">{errorMessage}</p>}

      {/* The toggle between the two modes. Clears any stale error. */}
      <button
        onClick={() => {
          setMode(mode === "signin" ? "signup" : "signin");
          setErrorMessage("");
        }}
      >
        {mode === "signin"
          ? "No account? Sign up instead"
          : "Have an account? Log in instead"}
      </button>
    </div>
  );
}