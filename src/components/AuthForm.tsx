// AuthForm.tsx — the screen you see when you're logged out.
// One form, two jobs: it can either sign you up or sign you in,
// depending on which mode the user has toggled.
//
// Notice what's MISSING: no callback prop like onLoginSuccess. We don't
// need one. When signIn succeeds, Supabase fires the auth change event,
// watchSession in App.tsx hears it, App re-renders, and this form
// disappears on its own. The subscription is the messenger.
//
// STYLING NOTE: App.tsx renders this inside ThemeCtx.Provider, so useT()
// hands us the same theme tokens every other component uses — which is
// why dark/light mode works here without any extra code.

import { useState, type CSSProperties } from "react";
import { signIn, signUp } from "./auth";
import { useT, display, body } from "./theme";

// startMode lets whoever opens the form pick which job it starts on —
// the header's "Sign up" button passes "signup", "Log in" passes
// "signin". It's only the STARTING mode; the toggle at the bottom still
// switches freely. (App.tsx also passes key={authMode}, which makes
// React rebuild the form fresh each time the mode button changes.)
export function AuthForm({ startMode = "signin" }: { startMode?: "signin" | "signup" }) {
  const T = useT();

  // Which job is the form doing right now?
  const [mode, setMode] = useState<"signin" | "signup">(startMode);

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

  // Both inputs share this look — it's the header search box's styling,
  // adapted for life inside a card. The background is T.bg (the page
  // color) so the fields read as "sunken" against the raised T.surface
  // card; using T.surface here would make them invisible in dark mode,
  // since the card itself is T.surface.
  const inputStyle: CSSProperties = {
    width: "100%", boxSizing: "border-box", padding: "9px 12px",
    borderRadius: 9, border: `1px solid ${T.borderH}`, background: T.bg,
    fontSize: 13, color: T.text, outline: "none",
    colorScheme: T.scheme, fontFamily: body,
  };

  return (
    <div style={{
      width: "100%", maxWidth: 360, background: T.surface,
      border: `1px solid ${T.border}`, borderRadius: 14,
      padding: "28px 26px", boxShadow: T.shadow, fontFamily: body,
    }}>
      {/* The same logo mark + wordmark as the app header, so the login
          screen is unmistakably Gamedex even with no header around it. */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
        <div style={{ width: 28, height: 28, borderRadius: 7, background: T.accent, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: display, fontWeight: 700, fontSize: 13 }}>gdx</div>
        <span style={{ fontFamily: display, fontWeight: 700, fontSize: 17, letterSpacing: "-0.02em", color: T.text }}>Gamedex</span>
      </div>

      <h2 style={{ margin: 0, fontFamily: display, fontWeight: 700, fontSize: 20, letterSpacing: "-0.02em", color: T.text }}>
        {mode === "signin" ? "Welcome back" : "Create your account"}
      </h2>
      <p style={{ margin: "6px 0 20px", color: T.meta, fontSize: 13, lineHeight: 1.5 }}>
        {mode === "signin"
          ? "Log in to get back to your list."
          : "Sign up to start tracking your games."}
      </p>

      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        // Enter in either field submits — what everyone's fingers expect
        // from a login form.
        onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
        style={{ ...inputStyle, marginBottom: 10 }}
      />

      <input
        type="password"
        placeholder="Password (6+ characters)"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
        style={{ ...inputStyle, marginBottom: 16 }}
      />

      <button
        onClick={handleSubmit}
        disabled={busy}
        style={{
          width: "100%", padding: "10px 0", borderRadius: 9, border: "none",
          background: T.accent, color: "#fff", fontWeight: 600, fontSize: 13.5,
          fontFamily: body, cursor: busy ? "default" : "pointer",
          // Dim while waiting on the network so the disabled state is visible.
          opacity: busy ? 0.6 : 1,
        }}
      >
        {busy ? "Working..." : mode === "signin" ? "Log in" : "Sign up"}
      </button>

      {/* Only render the error paragraph if there IS an error. The red is
          hardcoded because the theme has no "danger" token — it's one
          shade that stays readable on both the dark and light surfaces. */}
      {errorMessage && (
        <p style={{ margin: "12px 0 0", color: "#EF4444", fontSize: 12.5, lineHeight: 1.5 }}>
          {errorMessage}
        </p>
      )}

      {/* The toggle between the two modes. Clears any stale error. */}
      <div style={{ textAlign: "center", marginTop: 18 }}>
        <button
          onClick={() => {
            setMode(mode === "signin" ? "signup" : "signin");
            setErrorMessage("");
          }}
          style={{ background: "none", border: "none", color: T.link, fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: body, padding: 0 }}
        >
          {mode === "signin"
            ? "No account? Sign up instead"
            : "Have an account? Log in instead"}
        </button>
      </div>
    </div>
  );
}