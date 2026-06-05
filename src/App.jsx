import { useState, useMemo } from "react";

// ─── Global styles ──────────────────────────────────────────────────────────
(() => {
  if (document.getElementById("gv-setup")) return;
  const style = document.createElement("style");
  style.id = "gv-setup";
  style.textContent = `
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #0a0a0a; }
    input::placeholder, textarea::placeholder { color: #777; }
    select option { background: #fff; color: #111; }
    ::-webkit-scrollbar { width: 10px; height: 10px; }
    ::-webkit-scrollbar-track { background: #0a0a0a; }
    ::-webkit-scrollbar-thumb { background: #333; border-radius: 5px; }
    ::-webkit-scrollbar-thumb:hover { background: #444; }
    body, button, input, textarea, select { font-family: Verdana, Arial, Helvetica, sans-serif; }
  `;
  document.head.appendChild(style);
})();

// ─── MyAnimeList-style theme tokens ───────────────────────────────────────────
const T = {
  bg:        "#0a0a0a",
  header:    "#000000",
  nav:       "#2e51a2",
  navActive: "#24417f",
  panel:     "#161616",
  panelHead: "#2e2e2e",
  bar:       "#1f1f1f",
  card:      "#141414",
  border:    "#2a2a2a",
  text:      "#e8e8e8",
  meta:      "#a6a6a6",
  metaDim:   "#7a7a7a",
  link:      "#5b8fd6",
  linkHover: "#83a9e6",
  rank:      "#8c8c8c",
  amber:     "#f0a830",
  btn:       "#2b2b2b",
  red:       "#e0604d",
  green:     "#46a35e",
};

const ST = {
  playing:        { label: "Playing",      color: "#46a35e" },
  completed:      { label: "Completed",    color: "#5b8fd6" },
  "on-hold":      { label: "On-Hold",      color: "#f0a830" },
  dropped:        { label: "Dropped",      color: "#e0604d" },
  "plan-to-play": { label: "Plan to Play", color: "#9a9a9a" },
};

const clamp2 = { display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" };
const fmt = (n) => n.toLocaleString("en-US");
const members = (g) => Math.round(g.score * 100000) - g.id * 1234 + 50000;

// ─── Game data ────────────────────────────────────────────────────────────────
const GAMES = [
  { id:1,  title:"Elden Ring",                 genre:["Action","RPG"],          dev:"FromSoftware",        year:2022, plat:["PC","PS5","Xbox"],                    score:9.4, cover:"linear-gradient(150deg,#120500,#4a1600,#8B3500)", desc:"An open-world action RPG set in the Lands Between—a mythic realm shaped by Hidetaka Miyazaki and George R.R. Martin. Unforgiving combat, deep lore, and breathtaking vistas." },
  { id:2,  title:"God of War Ragnarök",        genre:["Action","Adventure"],    dev:"Santa Monica Studio", year:2022, plat:["PS5"],                                score:9.2, cover:"linear-gradient(150deg,#020215,#0b0b45,#181888)", desc:"Kratos and Atreus journey through all Nine Realms as Fimbulwinter grips the world and the gods of Asgard march to war. A cinematic masterpiece." },
  { id:3,  title:"The Witcher 3: Wild Hunt",   genre:["RPG","Adventure"],       dev:"CD Projekt Red",      year:2015, plat:["PC","PS5","Xbox","Nintendo Switch"], score:9.5, cover:"linear-gradient(150deg,#061000,#122400,#1c3800)", desc:"Play Geralt of Rivia in a vast open world packed with morally complex choices. Widely considered one of the greatest RPGs ever made." },
  { id:4,  title:"Red Dead Redemption 2",      genre:["Action","Adventure"],    dev:"Rockstar Games",      year:2018, plat:["PC","PS5","Xbox"],                    score:9.5, cover:"linear-gradient(150deg,#140300,#480e00,#782000)", desc:"Arthur Morgan and the Van der Linde gang are outlaws on the run. A cinematic epic of loyalty and loss set in the twilight of the American frontier." },
  { id:5,  title:"Cyberpunk 2077",             genre:["Action","RPG"],          dev:"CD Projekt Red",      year:2020, plat:["PC","PS5","Xbox"],                    score:8.3, cover:"linear-gradient(150deg,#000c18,#001a32,#002952)", desc:"Become V in Night City—a megalopolis of power, glamour, and body modification. A sprawling open-world action RPG with a gripping narrative." },
  { id:6,  title:"Hades",                      genre:["Action","Roguelike"],    dev:"Supergiant Games",    year:2020, plat:["PC","PS5","Xbox","Nintendo Switch"], score:9.1, cover:"linear-gradient(150deg,#12001e,#2e0048,#4e0088)", desc:"Defy the god of the dead as the immortal Prince of the Underworld. Exceptional combat, writing, and one of the most rewarding roguelite loops ever designed." },
  { id:7,  title:"Hollow Knight",              genre:["Action","Platformer"],   dev:"Team Cherry",         year:2017, plat:["PC","PS5","Xbox","Nintendo Switch"], score:9.0, cover:"linear-gradient(150deg,#000610,#00101e,#001530)", desc:"A beautifully hand-drawn 2D action-adventure set in the vast underground kingdom of Hallownest. Challenging, atmospheric, and deeply rewarding." },
  { id:8,  title:"Baldur's Gate 3",            genre:["RPG","Strategy"],        dev:"Larian Studios",      year:2023, plat:["PC","PS5"],                           score:9.6, cover:"linear-gradient(150deg,#070718,#120d32,#1c0058)", desc:"A masterpiece of the CRPG genre set in the Forgotten Realms. Epic storytelling, near-limitless player freedom, and consequences that ripple across a 100-hour adventure." },
  { id:9,  title:"Sekiro: Shadows Die Twice",  genre:["Action"],                dev:"FromSoftware",        year:2019, plat:["PC","PS5","Xbox"],                    score:9.0, cover:"linear-gradient(150deg,#180000,#3d0000,#680000)", desc:"A shinobi action game set in Sengoku-era Japan. Precise, rhythmic combat demands mastery and rewards patience like no other game." },
  { id:10, title:"Zelda: Tears of the Kingdom",genre:["Action","Adventure"],    dev:"Nintendo",            year:2023, plat:["Nintendo Switch"],                   score:9.4, cover:"linear-gradient(150deg,#00180d,#00321c,#00502d)", desc:"Link explores skies, depths, and surface of Hyrule wielding incredible new abilities in the acclaimed sequel to Breath of the Wild." },
  { id:11, title:"Ghost of Tsushima",          genre:["Action","Adventure"],    dev:"Sucker Punch",        year:2020, plat:["PS5"],                                score:9.0, cover:"linear-gradient(150deg,#180b00,#3a1800,#682a00)", desc:"Defend Tsushima island from a Mongol invasion as Jin Sakai, samurai-turned-ghost, in one of the most beautiful open worlds ever made." },
  { id:12, title:"Disco Elysium",              genre:["RPG","Indie"],           dev:"ZA/UM",               year:2019, plat:["PC","PS5","Xbox"],                    score:9.2, cover:"linear-gradient(150deg,#08131e,#102030,#183040)", desc:"A truly unique RPG: a detective with no memory navigates a ruined city. Every skill is a voice in your head. There is no combat—only choices." },
  { id:13, title:"Dark Souls III",             genre:["Action","RPG"],          dev:"FromSoftware",        year:2016, plat:["PC","PS5","Xbox"],                    score:9.1, cover:"linear-gradient(150deg,#080300,#1c0d00,#350000)", desc:"The culmination of the Dark Souls trilogy. Intricate level design, punishing but fair combat, and a haunting world on the brink of extinction." },
  { id:14, title:"Portal 2",                   genre:["Puzzle","Platformer"],   dev:"Valve",               year:2011, plat:["PC","PS5","Xbox"],                    score:9.3, cover:"linear-gradient(150deg,#001220,#073555,#0a5a8c)", desc:"A first-person puzzle masterpiece with a razor-sharp script, inventive mechanics, and one of gaming's best co-op campaigns." },
  { id:15, title:"Stardew Valley",             genre:["Simulation","Indie"],    dev:"ConcernedApe",        year:2016, plat:["PC","PS5","Xbox","Nintendo Switch"], score:8.9, cover:"linear-gradient(150deg,#04140a,#0c3018,#155028)", desc:"Inherit a run-down farm and build the life you want. A cozy, endlessly charming farming sim with surprising depth." },
  { id:16, title:"Celeste",                    genre:["Platformer","Indie"],    dev:"Maddy Makes Games",   year:2018, plat:["PC","PS5","Xbox","Nintendo Switch"], score:9.0, cover:"linear-gradient(150deg,#1a0014,#3a0030,#5a0050)", desc:"Help Madeline climb a mountain in this tight, expressive platformer about anxiety, perseverance, and self-acceptance." },
  { id:17, title:"The Last of Us Part II",     genre:["Action","Adventure"],    dev:"Naughty Dog",         year:2020, plat:["PS5"],                                score:8.8, cover:"linear-gradient(150deg,#0a1200,#1c2c00,#2e4400)", desc:"A harrowing, technically stunning narrative about revenge and its cost in a brutal post-pandemic America." },
  { id:18, title:"Hollow Knight: Silksong",    genre:["Action","Platformer"],   dev:"Team Cherry",         year:2024, plat:["PC","Nintendo Switch"],              score:9.0, cover:"linear-gradient(150deg,#140014,#2c0030,#440850)", desc:"The long-awaited sequel. Play as Hornet in a new kingdom of haunting beauty and demanding, graceful combat." },
  { id:19, title:"Death Stranding",            genre:["Action","Adventure"],    dev:"Kojima Productions",  year:2019, plat:["PC","PS5"],                           score:8.4, cover:"linear-gradient(150deg,#001012,#063034,#0a5258)", desc:"A divisive, singular experience about connection and isolation. Deliver cargo across a fractured America as Sam Porter Bridges." },
  { id:20, title:"Returnal",                   genre:["Action","Roguelike"],    dev:"Housemarque",         year:2021, plat:["PC","PS5"],                           score:8.5, cover:"linear-gradient(150deg,#16000c,#380020,#5c0038)", desc:"A roguelike bullet-hell wrapped in an atmospheric sci-fi mystery. Die, loop, and unravel the secrets of planet Atropos." },
];

const GENRES    = [...new Set(GAMES.flatMap(g => g.genre))].sort();
const PLATFORMS = [...new Set(GAMES.flatMap(g => g.plat))].sort();

// ─── Small components ─────────────────────────────────────────────────────────

function StatusLabel({ status }) {
  const s = ST[status];
  return (
    <span style={{ background: s.color, color: "#fff", fontSize: 10, fontWeight: "bold", padding: "2px 7px", borderRadius: 2, whiteSpace: "nowrap" }}>
      {s.label}
    </span>
  );
}

function CoverCard({ game, onOpen, w }) {
  const [h, setH] = useState(false);
  return (
    <div
      onClick={() => onOpen(game)}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      style={{ width: w || "100%", flexShrink: w ? 0 : 1, cursor: "pointer" }}
    >
      <div style={{ width: "100%", aspectRatio: "5 / 7", background: game.cover, borderRadius: 3, border: `1px solid ${h ? "#5b8fd6" : T.border}`, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 42, background: "linear-gradient(transparent, rgba(0,0,0,0.92))" }} />
        <span style={{ position: "absolute", left: 5, bottom: 4, color: T.amber, fontSize: 11, fontWeight: "bold" }}>★ {game.score}</span>
      </div>
      <div style={{ marginTop: 4, fontSize: 11, fontWeight: "bold", color: h ? T.linkHover : T.link, lineHeight: 1.25, ...clamp2 }}>
        {game.title}
      </div>
    </div>
  );
}

function SectionHeader({ title, action }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", borderBottom: `1px solid ${T.border}`, paddingBottom: 5, margin: "20px 0 12px" }}>
      <span style={{ color: "#fff", fontWeight: "bold", fontSize: 14 }}>{title}</span>
      {action && <span style={{ color: T.link, fontSize: 11, fontWeight: "bold", cursor: "pointer" }}>{action}</span>}
    </div>
  );
}

function RankRow({ rank, game, onOpen }) {
  const [h, setH] = useState(false);
  return (
    <div
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      style={{ position: "relative", display: "grid", gridTemplateColumns: "20px 40px 1fr", gap: 9, padding: "9px 11px", borderBottom: `1px solid ${T.border}`, background: h ? "#1d1d1d" : "transparent" }}
    >
      <span style={{ fontSize: 15, fontWeight: "bold", color: rank <= 3 ? T.amber : T.rank, alignSelf: "center", textAlign: "center" }}>{rank}</span>
      <div onClick={() => onOpen(game)} style={{ width: 40, height: 57, background: game.cover, borderRadius: 2, cursor: "pointer", flexShrink: 0 }} />
      <div style={{ minWidth: 0, paddingRight: 28 }}>
        <div onClick={() => onOpen(game)} style={{ color: T.link, fontWeight: "bold", fontSize: 12, lineHeight: 1.3, cursor: "pointer", ...clamp2 }}>{game.title}</div>
        <div style={{ color: T.meta, fontSize: 11, marginTop: 3 }}>{game.genre[0]}, {game.year}, scored {game.score.toFixed(2)}</div>
        <div style={{ color: T.metaDim, fontSize: 11 }}>{fmt(members(game))} members</div>
      </div>
      <button onClick={() => onOpen(game)} style={{ position: "absolute", top: 9, right: 10, fontSize: 10, color: T.link, background: T.btn, border: `1px solid ${T.border}`, borderRadius: 2, padding: "1px 7px", cursor: "pointer" }}>
        add
      </button>
    </div>
  );
}

function SidebarPanel({ title, games, onOpen }) {
  return (
    <div style={{ background: T.panel, border: `1px solid ${T.border}`, borderRadius: 3, marginBottom: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: T.panelHead, padding: "7px 11px", borderRadius: "3px 3px 0 0" }}>
        <span style={{ color: "#fff", fontWeight: "bold", fontSize: 13 }}>{title}</span>
        <span style={{ color: T.link, fontSize: 11, cursor: "pointer" }}>More</span>
      </div>
      <div>
        {games.map((g, i) => <RankRow key={g.id} rank={i + 1} game={g} onOpen={onOpen} />)}
      </div>
    </div>
  );
}

// ─── Home page (MyAnimeList homepage layout) ───────────────────────────────────

function HomePage({ games, query, onOpen }) {
  const welcome = (
    <div style={{ background: T.bar, borderLeft: `3px solid ${T.nav}`, padding: "9px 13px", color: "#fff", fontWeight: "bold", fontSize: 15, borderRadius: 2, marginBottom: 4 }}>
      Welcome to GameVault!
    </div>
  );

  if (query.trim()) {
    const lq = query.toLowerCase();
    const res = games.filter(g => g.title.toLowerCase().includes(lq) || g.dev.toLowerCase().includes(lq));
    return (
      <div>
        {welcome}
        <SectionHeader title={`Search results for "${query}"`} />
        {res.length ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(118px, 1fr))", gap: 13 }}>
            {res.map(g => <CoverCard key={g.id} game={g} onOpen={onOpen} />)}
          </div>
        ) : (
          <div style={{ color: T.meta, fontSize: 12, padding: "30px 0" }}>No games found for "{query}".</div>
        )}
      </div>
    );
  }

  const newest = [...games].sort((a, b) => b.year - a.year);
  const top    = [...games].sort((a, b) => b.score - a.score);

  return (
    <div>
      {welcome}

      <SectionHeader title="New & Trending" action="View More" />
      <div style={{ display: "flex", gap: 11, overflowX: "auto", paddingBottom: 6 }}>
        {newest.slice(0, 10).map(g => <CoverCard key={g.id} game={g} onOpen={onOpen} w={124} />)}
      </div>

      <SectionHeader title="Highest Rated" action="View More" />
      <div style={{ display: "flex", gap: 11, overflowX: "auto", paddingBottom: 6 }}>
        {top.slice(0, 10).map(g => <CoverCard key={g.id} game={g} onOpen={onOpen} w={124} />)}
      </div>

      <SectionHeader title="Browse All Games" />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(118px, 1fr))", gap: 13, paddingBottom: 30 }}>
        {games.map(g => <CoverCard key={g.id} game={g} onOpen={onOpen} />)}
      </div>
    </div>
  );
}

// ─── My List page ─────────────────────────────────────────────────────────────

function MyListPage({ userList, gameMap, onOpen }) {
  const [stFilter, setStFilter] = useState("all");

  const stats = useMemo(() => {
    const scored = userList.filter(e => e.score > 0);
    return {
      total: userList.length,
      playing: userList.filter(e => e.status === "playing").length,
      completed: userList.filter(e => e.status === "completed").length,
      hours: userList.reduce((s, e) => s + (e.hours || 0), 0),
      avg: scored.length ? (scored.reduce((s, e) => s + e.score, 0) / scored.length).toFixed(1) : "—",
    };
  }, [userList]);

  const rows = stFilter === "all" ? userList : userList.filter(e => e.status === stFilter);
  const TABS = ["all", ...Object.keys(ST)];

  if (!userList.length) {
    return (
      <div>
        <div style={{ background: T.bar, borderLeft: `3px solid ${T.nav}`, padding: "9px 13px", color: "#fff", fontWeight: "bold", fontSize: 15, borderRadius: 2, marginBottom: 16 }}>
          My Game List
        </div>
        <div style={{ background: T.panel, border: `1px solid ${T.border}`, borderRadius: 3, padding: "50px 20px", textAlign: "center", color: T.meta, fontSize: 13 }}>
          Your list is empty. Browse games and click <span style={{ color: T.link }}>add</span> to start tracking.
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ background: T.bar, borderLeft: `3px solid ${T.nav}`, padding: "9px 13px", color: "#fff", fontWeight: "bold", fontSize: 15, borderRadius: 2, marginBottom: 14 }}>
        My Game List
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))", gap: 8, marginBottom: 16 }}>
        {[["Total", stats.total], ["Playing", stats.playing], ["Completed", stats.completed], ["Hours", `${stats.hours}h`], ["Mean Score", stats.avg]].map(([label, val]) => (
          <div key={label} style={{ background: T.panel, border: `1px solid ${T.border}`, borderRadius: 3, padding: "11px 12px" }}>
            <div style={{ fontSize: 19, fontWeight: "bold", color: "#fff" }}>{val}</div>
            <div style={{ fontSize: 11, color: T.metaDim, marginTop: 2 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 12, flexWrap: "wrap" }}>
        {TABS.map(tab => {
          const active = stFilter === tab;
          const count = tab === "all" ? userList.length : userList.filter(e => e.status === tab).length;
          return (
            <button key={tab} onClick={() => setStFilter(tab)} style={{
              padding: "5px 12px", borderRadius: 2, fontSize: 11, fontWeight: "bold", cursor: "pointer",
              border: `1px solid ${active ? T.nav : T.border}`,
              background: active ? T.nav : T.card,
              color: active ? "#fff" : T.meta,
            }}>
              {tab === "all" ? "All" : ST[tab].label} ({count})
            </button>
          );
        })}
      </div>

      {/* Table */}
      <div style={{ background: T.panel, border: `1px solid ${T.border}`, borderRadius: 3, overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 110px 60px 60px", padding: "8px 12px", background: T.panelHead, fontSize: 10, fontWeight: "bold", color: "#ddd", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          <span>Game</span><span>Status</span><span style={{ textAlign: "center" }}>Score</span><span style={{ textAlign: "center" }}>Hours</span>
        </div>
        {rows.map((entry, i) => {
          const g = gameMap[entry.id];
          if (!g) return null;
          return (
            <div key={entry.id} style={{ display: "grid", gridTemplateColumns: "1fr 110px 60px 60px", padding: "10px 12px", borderBottom: i < rows.length - 1 ? `1px solid ${T.border}` : "none", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 9, minWidth: 0 }}>
                <div onClick={() => onOpen(g)} style={{ width: 34, height: 34, borderRadius: 2, background: g.cover, flexShrink: 0, cursor: "pointer" }} />
                <div style={{ minWidth: 0 }}>
                  <div onClick={() => onOpen(g)} style={{ fontSize: 12, fontWeight: "bold", color: T.link, cursor: "pointer", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{g.title}</div>
                  <div style={{ fontSize: 10, color: T.metaDim }}>{g.genre.join(", ")}</div>
                </div>
              </div>
              <StatusLabel status={entry.status} />
              <div style={{ textAlign: "center", fontSize: 13, fontWeight: "bold", color: entry.score ? T.amber : T.metaDim }}>{entry.score || "—"}</div>
              <div style={{ textAlign: "center", fontSize: 11, color: T.meta }}>{entry.hours > 0 ? `${entry.hours}h` : "—"}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Detail page (MyAnimeList two-column layout) ───────────────────────────────

function DetailPage({ game, entry, onBack, onSave, onRemove }) {
  const [status, setStatus] = useState(entry?.status || "plan-to-play");
  const [score, setScore]   = useState(entry?.score || 0);
  const [hours, setHours]   = useState(entry?.hours || 0);
  const [notes, setNotes]   = useState(entry?.notes || "");

  const infoRow = (label, val) => (
    <div style={{ fontSize: 12, color: T.meta, marginBottom: 7, lineHeight: 1.4 }}>
      <span style={{ color: "#fff", fontWeight: "bold" }}>{label}:</span> {val}
    </div>
  );

  return (
    <div>
      <div style={{ marginBottom: 12 }}>
        <span onClick={onBack} style={{ color: T.link, fontSize: 12, cursor: "pointer" }}>← Back</span>
      </div>

      <h1 style={{ color: "#fff", fontSize: 22, fontWeight: "bold", marginBottom: 14, lineHeight: 1.2 }}>{game.title}</h1>

      <div style={{ display: "flex", gap: 20, alignItems: "flex-start", flexWrap: "wrap" }}>
        {/* Left sidebar */}
        <div style={{ width: 200, flexShrink: 0 }}>
          <div style={{ width: "100%", aspectRatio: "5 / 7", background: game.cover, borderRadius: 3, border: `1px solid ${T.border}`, marginBottom: 14 }} />

          <div style={{ background: T.panel, border: `1px solid ${T.border}`, borderRadius: 3, padding: "12px 13px", marginBottom: 14 }}>
            <div style={{ textAlign: "center", paddingBottom: 11, marginBottom: 11, borderBottom: `1px solid ${T.border}` }}>
              <div style={{ fontSize: 10, color: T.metaDim, textTransform: "uppercase", letterSpacing: "0.06em" }}>Community Score</div>
              <div style={{ fontSize: 30, fontWeight: "bold", color: T.amber, lineHeight: 1.3 }}>★ {game.score}</div>
            </div>
            {infoRow("Developer", game.dev)}
            {infoRow("Released", game.year)}
            {infoRow("Platforms", game.plat.join(", "))}
            {infoRow("Genres", game.genre.join(", "))}
          </div>
        </div>

        {/* Main column */}
        <div style={{ flex: 1, minWidth: 260 }}>
          <div style={{ background: T.panelHead, color: "#fff", fontWeight: "bold", fontSize: 13, padding: "6px 11px", borderRadius: "3px 3px 0 0" }}>Synopsis</div>
          <div style={{ background: T.panel, border: `1px solid ${T.border}`, borderTop: "none", borderRadius: "0 0 3px 3px", padding: "13px 14px", color: T.text, fontSize: 13, lineHeight: 1.7, marginBottom: 18 }}>
            {game.desc}
          </div>

          <div style={{ background: T.panelHead, color: "#fff", fontWeight: "bold", fontSize: 13, padding: "6px 11px", borderRadius: "3px 3px 0 0" }}>
            {entry ? "Edit Your Entry" : "Add to My List"}
          </div>
          <div style={{ background: T.panel, border: `1px solid ${T.border}`, borderTop: "none", borderRadius: "0 0 3px 3px", padding: "15px 14px" }}>
            {/* Status */}
            <div style={{ fontSize: 11, color: T.metaDim, marginBottom: 7, textTransform: "uppercase", letterSpacing: "0.05em" }}>Status</div>
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 16 }}>
              {Object.entries(ST).map(([v, s]) => (
                <button key={v} onClick={() => setStatus(v)} style={{
                  padding: "6px 12px", borderRadius: 2, fontSize: 11, fontWeight: "bold", cursor: "pointer",
                  border: `1px solid ${status === v ? s.color : T.border}`,
                  background: status === v ? s.color : T.card,
                  color: status === v ? "#fff" : T.meta,
                }}>{s.label}</button>
              ))}
            </div>

            {/* Score */}
            <div style={{ fontSize: 11, color: T.metaDim, marginBottom: 7, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Your Score{score > 0 ? ` — ${score}/10` : ""}
            </div>
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 16 }}>
              {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
                <button key={n} onClick={() => setScore(score === n ? 0 : n)} style={{
                  width: 34, height: 30, borderRadius: 2, fontSize: 12, fontWeight: "bold", cursor: "pointer",
                  border: `1px solid ${score >= n ? T.amber : T.border}`,
                  background: score >= n ? "rgba(240,168,48,0.15)" : T.card,
                  color: score >= n ? T.amber : T.metaDim,
                }}>{n}</button>
              ))}
            </div>

            {/* Hours */}
            <div style={{ fontSize: 11, color: T.metaDim, marginBottom: 7, textTransform: "uppercase", letterSpacing: "0.05em" }}>Hours Played</div>
            <input type="number" min="0" value={hours} onChange={e => setHours(Math.max(0, Number(e.target.value)))}
              style={{ width: 100, padding: "7px 9px", borderRadius: 2, border: `1px solid ${T.border}`, background: T.card, color: T.text, fontSize: 12, outline: "none", marginBottom: 16 }} />

            {/* Notes */}
            <div style={{ fontSize: 11, color: T.metaDim, marginBottom: 7, textTransform: "uppercase", letterSpacing: "0.05em" }}>Notes</div>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="Your thoughts, review..."
              style={{ width: "100%", padding: "9px 11px", borderRadius: 2, border: `1px solid ${T.border}`, background: T.card, color: T.text, fontSize: 12, resize: "vertical", outline: "none", marginBottom: 16 }} />

            {/* Actions */}
            <div style={{ display: "flex", gap: 7 }}>
              <button onClick={() => onSave({ status, score, hours, notes })}
                style={{ padding: "10px 20px", borderRadius: 2, fontSize: 12, fontWeight: "bold", cursor: "pointer", border: "none", background: T.nav, color: "#fff", flex: 1 }}>
                {entry ? "Update" : "Add to My List"}
              </button>
              {entry && (
                <button onClick={onRemove}
                  style={{ padding: "10px 16px", borderRadius: 2, fontSize: 12, fontWeight: "bold", cursor: "pointer", border: `1px solid ${T.red}`, background: "transparent", color: T.red }}>
                  Remove
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Top header + nav ─────────────────────────────────────────────────────────

function TopHeader({ onHome }) {
  return (
    <div style={{ background: T.header, borderBottom: "1px solid #1a1a1a" }}>
      <div style={{ maxWidth: 1024, margin: "0 auto", padding: "11px 12px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div onClick={onHome} style={{ color: "#fff", fontWeight: "bold", fontSize: 25, letterSpacing: "-0.5px", cursor: "pointer" }}>
          Game<span style={{ color: T.link }}>Vault</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <span style={{ color: "#999", fontSize: 11, cursor: "pointer" }}>Hide Ads</span>
          <button style={{ background: T.btn, color: "#fff", border: "none", padding: "6px 16px", borderRadius: 3, fontSize: 12, fontWeight: "bold", cursor: "pointer" }}>Login</button>
          <button style={{ background: T.nav, color: "#fff", border: "none", padding: "6px 16px", borderRadius: 3, fontSize: 12, fontWeight: "bold", cursor: "pointer" }}>Sign Up</button>
        </div>
      </div>
    </div>
  );
}

function NavBar({ page, go, query, setQuery }) {
  const items = [["Browse", "home"], ["My List", "mylist"], ["Top Games", "home"], ["Community", null], ["Help", null]];
  return (
    <div style={{ background: T.nav }}>
      <div style={{ maxWidth: 1024, margin: "0 auto", padding: "0 12px", display: "flex", alignItems: "center", height: 38 }}>
        {items.map(([label, p], i) => {
          const active = p && (page === p) && (label !== "Top Games");
          return (
            <span key={i} onClick={() => p && go(p)} style={{
              color: "#fff", fontWeight: "bold", fontSize: 12, padding: "0 13px", height: 38,
              display: "flex", alignItems: "center", cursor: p ? "pointer" : "default",
              background: active ? T.navActive : "transparent",
            }}>{label}</span>
          );
        })}
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center" }}>
          <select style={{ height: 25, border: "none", fontSize: 11, padding: "0 4px", borderRadius: "3px 0 0 3px", outline: "none" }}>
            <option>All</option>
          </select>
          <input
            value={query}
            onChange={e => { setQuery(e.target.value); go("home"); }}
            placeholder="Search games, developers..."
            style={{ height: 25, width: 210, border: "none", padding: "0 9px", fontSize: 11, outline: "none", color: "#111" }}
          />
          <button style={{ height: 25, background: "#1c1c1c", color: "#fff", border: "none", padding: "0 11px", cursor: "pointer", borderRadius: "0 3px 3px 0", display: "flex", alignItems: "center" }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── App root ─────────────────────────────────────────────────────────────────

export default function App() {
  const [page, setPage]     = useState("home"); // "home" | "mylist" | "detail"
  const [prevPage, setPrev] = useState("home");
  const [selGame, setSel]   = useState(null);
  const [userList, setList] = useState([]);
  const [query, setQuery]   = useState("");

  const listMap = useMemo(() => Object.fromEntries(userList.map(e => [e.id, e])), [userList]);
  const gameMap = useMemo(() => Object.fromEntries(GAMES.map(g => [g.id, g])), []);

  const topRated = useMemo(() => [...GAMES].sort((a, b) => b.score - a.score).slice(0, 5), []);
  const popular  = useMemo(() => [...GAMES].sort((a, b) => members(b) - members(a)).slice(0, 5), []);

  const openGame = (game) => { setPrev(page === "detail" ? prevPage : page); setSel(game); setPage("detail"); };
  const goBack   = () => { setPage(prevPage); setSel(null); };
  const go       = (p) => { setSel(null); setPage(p); };

  const saveEntry = ({ status, score, hours, notes }) => {
    setList(prev => {
      const ex = prev.find(e => e.id === selGame.id);
      const entry = { id: selGame.id, status, score, hours, notes, dateAdded: ex?.dateAdded || Date.now() };
      return ex ? prev.map(e => e.id === selGame.id ? entry : e) : [...prev, entry];
    });
    goBack();
  };
  const removeEntry = () => { setList(prev => prev.filter(e => e.id !== selGame.id)); goBack(); };

  return (
    <div style={{ minHeight: "100vh", background: T.bg, color: T.text }}>
      <TopHeader onHome={() => { setQuery(""); go("home"); }} />
      <NavBar page={page} go={go} query={query} setQuery={setQuery} />

      <div style={{ maxWidth: 1024, margin: "0 auto", padding: "16px 12px", display: "flex", gap: 18, alignItems: "flex-start" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {page === "detail" && selGame ? (
            <DetailPage game={selGame} entry={listMap[selGame.id]} onBack={goBack} onSave={saveEntry} onRemove={removeEntry} />
          ) : page === "mylist" ? (
            <MyListPage userList={userList} gameMap={gameMap} onOpen={openGame} />
          ) : (
            <HomePage games={GAMES} query={query} onOpen={openGame} />
          )}
        </div>

        {page === "home" && (
          <aside style={{ width: 290, flexShrink: 0 }}>
            <SidebarPanel title="Top Rated Games" games={topRated} onOpen={openGame} />
            <SidebarPanel title="Most Popular" games={popular} onOpen={openGame} />
          </aside>
        )}
      </div>
    </div>
  );
}