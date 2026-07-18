import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import App from "./App.tsx";

// BrowserRouter makes the URL part of the app's state: it lets App read
// the current path and change it, and it's why the back button, refresh,
// and shareable links work. It wraps App so every component inside can
// use the router's hooks.
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
