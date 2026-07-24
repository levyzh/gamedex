// ─── Global styles + fonts ────────────────────────────────────────────────────
(() => {
  if (typeof document === "undefined" || document.getElementById("gdx-setup")) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href =
    "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&display=swap";
  document.head.appendChild(link);
  const style = document.createElement("style");
  style.id = "gdx-setup";
  style.textContent = `
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    ::-webkit-scrollbar { width: 8px; height: 8px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: rgba(128,128,128,0.35); border-radius: 4px; }
    button { font-family: 'Inter', sans-serif; }
    input, textarea, select { font-family: 'Inter', sans-serif; }
    a { text-decoration: none; }
    @keyframes gdx-banner-in { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes gdx-spin { to { transform: rotate(360deg); } }
    .gdx-hscroll { scrollbar-width: none; -ms-overflow-style: none; }
    .gdx-hscroll::-webkit-scrollbar { display: none; }
    @media (max-width: 820px) {
      .gdx-body { flex-direction: column !important; }
      .gdx-rail { width: 100% !important; }
      .gdx-detail { grid-template-columns: 1fr !important; }
    }
  `;
  document.head.appendChild(style);
})();