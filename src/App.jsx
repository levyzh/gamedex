import { useState, useMemo } from "react";

// ─── Global styles + fonts ────────────────────────────────────────────────────
(() => {
  if (document.getElementById("gv-setup")) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href =
    "https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500&display=swap";
  document.head.appendChild(link);
  const style = document.createElement("style");
  style.id = "gv-setup";
  style.textContent = `
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #080B14; }
    input::placeholder, textarea::placeholder { color: #475569; }
    select option { background: #0D1120; color: #F1F5F9; }
    ::-webkit-scrollbar { width: 6px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.12); border-radius: 3px; }
    button { font-family: 'DM Sans', sans-serif; }
    input, textarea, select { font-family: 'DM Sans', sans-serif; }
  `;
  document.head.appendChild(style);
})();

// ─── Design tokens ────────────────────────────────────────────────────────────
const T = {
  bg:       "#080B14",
  surface:  "#0D1120",
  card:     "#121826",
  cardH:    "#18203a",
  accent:   "#818CF8",
  accentB:  "#6366F1",
  accentDim:"rgba(99,102,241,0.12)",
  text:     "#F1F5F9",
  ts:       "#8B9BB4",
  tm:       "#475569",
  bord:     "rgba(255,255,255,0.07)",
  bordH:    "rgba(255,255,255,0.15)",
  green:    "#10B981",
  amber:    "#F59E0B",
  red:      "#EF4444",
  gray:     "#64748B",
};

// ─── Status config ────────────────────────────────────────────────────────────
const ST = {
  playing:         { label: "Playing",       color: T.green,  bg: "rgba(16,185,129,0.12)"  },
  completed:       { label: "Completed",     color: T.accent, bg: "rgba(129,140,248,0.12)" },
  "on-hold":       { label: "On-Hold",       color: T.amber,  bg: "rgba(245,158,11,0.12)"  },
  dropped:         { label: "Dropped",       color: T.red,    bg: "rgba(239,68,68,0.12)"   },
  "plan-to-play":  { label: "Plan to Play",  color: T.gray,   bg: "rgba(100,116,139,0.12)" },
};

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
  { id:14, title:"Monster Hunter: World",      genre:["Action","RPG"],          dev:"Capcom",              year:2018, plat:["PC","PS5","Xbox"],                    score:8.9, cover:"linear-gradient(150deg,#091300,#162800,#224000)", desc:"Hunt colossal monsters in a living ecosystem. Forge weapons and armor from your prey. An addictive loop of preparation, pursuit, and payoff." },
  { id:15, title:"Horizon Forbidden West",     genre:["Action","Adventure"],    dev:"Guerrilla Games",     year:2022, plat:["PS5"],                                score:8.8, cover:"linear-gradient(150deg,#001816,#002e2a,#004840)", desc:"Aloy ventures into overgrown ruins of the American west, facing new machines and uncovering a world-threatening mystery in stunning open-world splendor." },
  { id:16, title:"Final Fantasy XVI",          genre:["Action","RPG"],          dev:"Square Enix",         year:2023, plat:["PS5"],                                score:8.7, cover:"linear-gradient(150deg,#090016,#180035,#2a0055)", desc:"A dark, mature Final Fantasy. Clive Rosfield seeks revenge in a war-torn world where wielders of godlike power clash in breathtaking titan battles." },
  { id:17, title:"Returnal",                   genre:["Action","Roguelike"],    dev:"Housemarque",         year:2021, plat:["PC","PS5"],                           score:8.8, cover:"linear-gradient(150deg,#00180c,#002c18,#004826)", desc:"Selene crash-lands on a hostile alien planet and is trapped in an eternal cycle of death and rebirth. A punishing but deeply rewarding roguelite." },
  { id:18, title:"Marvel's Spider-Man 2",      genre:["Action","Adventure"],    dev:"Insomniac Games",     year:2023, plat:["PS5"],                                score:9.0, cover:"linear-gradient(150deg,#180000,#3a0000,#640000)", desc:"Peter Parker and Miles Morales face the Venom symbiote and iconic villains across an expanded, richly detailed New York City." },
  { id:19, title:"Starfield",                  genre:["RPG","Shooter"],         dev:"Bethesda",            year:2023, plat:["PC","Xbox"],                           score:7.8, cover:"linear-gradient(150deg,#010108,#020220,#030335)", desc:"Bethesda's first new IP in 25+ years. Explore hundreds of planets, build ships, and unravel the mystery of ancient artifacts scattered across the galaxy." },
  { id:20, title:"Stardew Valley",             genre:["Simulation","Indie"],    dev:"ConcernedApe",        year:2016, plat:["PC","PS5","Xbox","Nintendo Switch"], score:9.3, cover:"linear-gradient(150deg,#0c1e00,#1f3d00,#346600)", desc:"Leave city life behind and build the farm of your dreams. A lovingly crafted RPG with seasons, romance, fishing, and a surprisingly deep story." },
];

const GENRES    = [...new Set(GAMES.flatMap(g => g.genre))].sort();
const PLATFORMS = [...new Set(GAMES.flatMap(g => g.plat))].sort();

// ─── Shared components ────────────────────────────────────────────────────────

function Badge({ status }) {
  const s = ST[status];
  return (
    <span style={{
      padding: "3px 8px", borderRadius: 4, fontSize: 11, fontWeight: 500,
      color: s.color, background: s.bg, whiteSpace: "nowrap",
    }}>
      {s.label}
    </span>
  );
}

function GameCard({ game, entry, onOpen }) {
  const [hov, setHov] = useState(false);
  return (
    <div
      onClick={() => onOpen(game)}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        borderRadius: 10, overflow: "hidden", cursor: "pointer",
        border: `1px solid ${hov ? T.bordH : T.bord}`,
        background: T.card,
        transform: hov ? "translateY(-3px)" : "none",
        transition: "transform 0.18s, border-color 0.18s, box-shadow 0.18s",
        boxShadow: hov ? "0 8px 28px rgba(0,0,0,0.45)" : "none",
      }}
    >
      {/* Cover */}
      <div style={{
        height: 185, background: game.cover, position: "relative",
        display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: 10,
      }}>
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.88) 0%, transparent 55%)" }} />
        <div style={{ position: "absolute", top: 9, left: 9, background: "rgba(0,0,0,0.6)", borderRadius: 4, padding: "2px 7px", fontSize: 12, fontWeight: 600, color: T.amber }}>
          ★ {game.score}
        </div>
        {entry && (
          <div style={{ position: "absolute", top: 9, right: 9 }}>
            <Badge status={entry.status} />
          </div>
        )}
        <div style={{ position: "relative", display: "flex", gap: 3, flexWrap: "wrap" }}>
          {game.genre.slice(0, 2).map(g => (
            <span key={g} style={{ fontSize: 9, padding: "2px 5px", borderRadius: 3, background: "rgba(99,102,241,0.3)", color: "#a5b4fc", textTransform: "uppercase", letterSpacing: "0.05em" }}>{g}</span>
          ))}
        </div>
      </div>
      {/* Info */}
      <div style={{ padding: "10px 12px" }}>
        <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 13, fontWeight: 700, color: T.text, lineHeight: 1.3, marginBottom: 3 }}>
          {game.title}
        </div>
        <div style={{ fontSize: 11, color: T.tm }}>{game.dev} · {game.year}</div>
        {entry?.score > 0 && (
          <div style={{ marginTop: 5, fontSize: 11, color: T.ts }}>
            Your score: <span style={{ color: T.amber, fontWeight: 600 }}>{entry.score}/10</span>
            {entry.hours > 0 && ` · ${entry.hours}h`}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Browse page ──────────────────────────────────────────────────────────────

function BrowsePage({ games, listMap, onOpen }) {
  const [q,     setQ]    = useState("");
  const [genre, setGenre] = useState("all");
  const [plat,  setPlat]  = useState("all");
  const [sort,  setSort]  = useState("score");

  const results = useMemo(() => {
    let list = games;
    if (q) {
      const lq = q.toLowerCase();
      list = list.filter(g => g.title.toLowerCase().includes(lq) || g.dev.toLowerCase().includes(lq));
    }
    if (genre !== "all") list = list.filter(g => g.genre.includes(genre));
    if (plat  !== "all") list = list.filter(g => g.plat.includes(plat));
    if (sort === "score") return [...list].sort((a, b) => b.score - a.score);
    if (sort === "title") return [...list].sort((a, b) => a.title.localeCompare(b.title));
    if (sort === "year")  return [...list].sort((a, b) => b.year - a.year);
    return list;
  }, [games, q, genre, plat, sort]);

  const selStyle = {
    padding: "7px 10px", borderRadius: 6, border: `1px solid ${T.bord}`,
    background: T.surface, color: T.ts, fontSize: 13, cursor: "pointer", outline: "none",
  };

  return (
    <div>
      {/* Hero */}
      <div style={{ textAlign: "center", padding: "50px 0 30px" }}>
        <div style={{ fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: T.accent, marginBottom: 12, fontWeight: 500 }}>
          TRACK · RATE · DISCOVER
        </div>
        <h1 style={{ fontFamily: "'Syne',sans-serif", fontSize: 42, fontWeight: 800, color: T.text, margin: "0 0 10px", lineHeight: 1.1 }}>
          Your Gaming Library
        </h1>
        <p style={{ color: T.ts, fontSize: 15, margin: "0 0 24px" }}>
          Track every game you've played, rate them, and discover what to play next.
        </p>
        <div style={{ position: "relative", maxWidth: 480, margin: "0 auto" }}>
          <span style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", fontSize: 15, color: T.tm, pointerEvents: "none" }}>🔍</span>
          <input
            type="text"
            placeholder="Search games or developers..."
            value={q}
            onChange={e => setQ(e.target.value)}
            style={{ width: "100%", padding: "11px 14px 11px 38px", borderRadius: 8, border: `1px solid ${T.bord}`, background: T.surface, color: T.text, fontSize: 14, outline: "none" }}
          />
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 8, marginBottom: 22, flexWrap: "wrap", alignItems: "center" }}>
        <select value={genre} onChange={e => setGenre(e.target.value)} style={selStyle}>
          <option value="all">All Genres</option>
          {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
        </select>
        <select value={plat} onChange={e => setPlat(e.target.value)} style={selStyle}>
          <option value="all">All Platforms</option>
          {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <select value={sort} onChange={e => setSort(e.target.value)} style={selStyle}>
          <option value="score">Top Rated</option>
          <option value="year">Newest First</option>
          <option value="title">A–Z</option>
        </select>
        <span style={{ marginLeft: "auto", fontSize: 12, color: T.tm }}>{results.length} games</span>
      </div>

      {/* Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(158px, 1fr))", gap: 14, paddingBottom: 60 }}>
        {results.map(g => (
          <GameCard key={g.id} game={g} entry={listMap[g.id]} onOpen={onOpen} />
        ))}
      </div>
      {!results.length && (
        <div style={{ textAlign: "center", padding: "70px 0", color: T.tm, fontSize: 14 }}>
          No games found. Try adjusting your filters.
        </div>
      )}
    </div>
  );
}

// ─── My List page ─────────────────────────────────────────────────────────────

function MyListPage({ userList, gameMap, onOpen }) {
  const [stFilter, setStFilter] = useState("all");
  const [sort, setSort]         = useState("date");

  const stats = useMemo(() => {
    const scored = userList.filter(e => e.score > 0);
    return {
      total:     userList.length,
      playing:   userList.filter(e => e.status === "playing").length,
      completed: userList.filter(e => e.status === "completed").length,
      hours:     userList.reduce((s, e) => s + (e.hours || 0), 0),
      avg:       scored.length
                   ? (scored.reduce((s, e) => s + e.score, 0) / scored.length).toFixed(1)
                   : "—",
    };
  }, [userList]);

  const rows = useMemo(() => {
    let list = stFilter === "all" ? userList : userList.filter(e => e.status === stFilter);
    if (sort === "score") return [...list].sort((a, b) => (b.score || 0) - (a.score || 0));
    if (sort === "hours") return [...list].sort((a, b) => (b.hours || 0) - (a.hours || 0));
    if (sort === "title") return [...list].sort((a, b) => (gameMap[a.id]?.title || "").localeCompare(gameMap[b.id]?.title || ""));
    return list;
  }, [userList, stFilter, sort, gameMap]);

  const TABS = ["all", ...Object.keys(ST)];

  if (!userList.length) {
    return (
      <div style={{ textAlign: "center", padding: "90px 0" }}>
        <div style={{ fontSize: 52, marginBottom: 16 }}>🎮</div>
        <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 22, fontWeight: 700, color: T.text, marginBottom: 8 }}>
          Your list is empty
        </div>
        <div style={{ color: T.tm, fontSize: 14 }}>Browse games and click any to add them to your list.</div>
      </div>
    );
  }

  return (
    <div style={{ paddingTop: 30, paddingBottom: 60 }}>
      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: 10, marginBottom: 26 }}>
        {[
          ["🎮", "Total Games",   stats.total],
          ["▶",  "Playing",       stats.playing],
          ["✅", "Completed",     stats.completed],
          ["⏱",  "Hours Played",  `${stats.hours}h`],
          ["⭐", "Avg Score",     stats.avg],
        ].map(([icon, label, val]) => (
          <div key={label} style={{ background: T.card, border: `1px solid ${T.bord}`, borderRadius: 10, padding: 14, textAlign: "center" }}>
            <div style={{ fontSize: 22, marginBottom: 4 }}>{icon}</div>
            <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 20, fontWeight: 700, color: T.text }}>{val}</div>
            <div style={{ fontSize: 10, color: T.tm, marginTop: 2 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Status tabs + sort */}
      <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
        {TABS.map(tab => {
          const s     = tab === "all" ? null : ST[tab];
          const count = tab === "all" ? userList.length : userList.filter(e => e.status === tab).length;
          const active = stFilter === tab;
          return (
            <button key={tab} onClick={() => setStFilter(tab)} style={{
              padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 500, cursor: "pointer",
              border: `1px solid ${active ? (s?.color || T.accent) : T.bord}`,
              background: active ? (s?.bg || T.accentDim) : "transparent",
              color: active ? (s?.color || T.accent) : T.tm,
              transition: "all 0.12s",
            }}>
              {tab === "all" ? "All" : ST[tab].label} ({count})
            </button>
          );
        })}
        <select value={sort} onChange={e => setSort(e.target.value)} style={{ marginLeft: "auto", padding: "4px 8px", borderRadius: 6, border: `1px solid ${T.bord}`, background: T.surface, color: T.ts, fontSize: 12, cursor: "pointer", outline: "none" }}>
          <option value="date">Date Added</option>
          <option value="score">My Score</option>
          <option value="hours">Hours</option>
          <option value="title">Title</option>
        </select>
      </div>

      {/* Table */}
      <div style={{ background: T.card, border: `1px solid ${T.bord}`, borderRadius: 10, overflow: "hidden" }}>
        {/* Header */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 115px 68px 68px 56px", padding: "9px 16px", borderBottom: `1px solid ${T.bord}`, fontSize: 10, fontWeight: 600, color: T.tm, textTransform: "uppercase", letterSpacing: "0.08em" }}>
          <span>Game</span>
          <span>Status</span>
          <span style={{ textAlign: "center" }}>Score</span>
          <span style={{ textAlign: "center" }}>Hours</span>
          <span></span>
        </div>
        {/* Rows */}
        {rows.map((entry, i) => {
          const g = gameMap[entry.id];
          if (!g) return null;
          return (
            <div key={entry.id} style={{ display: "grid", gridTemplateColumns: "1fr 115px 68px 68px 56px", padding: "12px 16px", borderBottom: i < rows.length - 1 ? `1px solid ${T.bord}` : "none", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                <div style={{ width: 36, height: 36, borderRadius: 6, background: g.cover, flexShrink: 0 }} />
                <div style={{ minWidth: 0 }}>
                  <div
                    onClick={() => onOpen(g)}
                    style={{ fontFamily: "'Syne',sans-serif", fontSize: 13, fontWeight: 700, color: T.text, cursor: "pointer", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                  >
                    {g.title}
                  </div>
                  <div style={{ fontSize: 10, color: T.tm }}>{g.genre.slice(0, 2).join(", ")}</div>
                </div>
              </div>
              <Badge status={entry.status} />
              <div style={{ textAlign: "center", fontSize: 14, fontWeight: 600, color: entry.score ? T.amber : T.tm }}>
                {entry.score || "—"}
              </div>
              <div style={{ textAlign: "center", fontSize: 12, color: T.ts }}>
                {entry.hours > 0 ? `${entry.hours}h` : "—"}
              </div>
              <div style={{ textAlign: "right" }}>
                <button
                  onClick={() => onOpen(g)}
                  style={{ padding: "3px 9px", borderRadius: 4, fontSize: 11, cursor: "pointer", border: `1px solid ${T.bord}`, background: "transparent", color: T.ts }}
                >
                  Edit
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Game detail page ─────────────────────────────────────────────────────────

function DetailPage({ game, entry, onBack, onSave, onRemove }) {
  const [status, setStatus] = useState(entry?.status || "plan-to-play");
  const [score,  setScore]  = useState(entry?.score  || 0);
  const [hours,  setHours]  = useState(entry?.hours  || 0);
  const [notes,  setNotes]  = useState(entry?.notes  || "");

  return (
    <div style={{ paddingBottom: 70 }}>
      {/* Full-bleed cover */}
      <div style={{
        height: 260, background: game.cover, position: "relative",
        display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: "22px 20px",
        marginLeft: -20, marginRight: -20,
      }}>
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, #080B14 0%, rgba(8,11,20,0.55) 50%, rgba(8,11,20,0.08) 100%)" }} />
        <button
          onClick={onBack}
          style={{ position: "absolute", top: 18, left: 20, background: "rgba(0,0,0,0.55)", border: `1px solid ${T.bord}`, borderRadius: 6, padding: "5px 13px", color: T.ts, cursor: "pointer", fontSize: 13 }}
        >
          ← Back
        </button>
        <div style={{ position: "relative" }}>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 9 }}>
            {game.genre.map(g => (
              <span key={g} style={{ fontSize: 10, padding: "2px 7px", borderRadius: 3, background: "rgba(99,102,241,0.28)", color: "#a5b4fc", textTransform: "uppercase", letterSpacing: "0.06em" }}>{g}</span>
            ))}
          </div>
          <h1 style={{ fontFamily: "'Syne',sans-serif", fontSize: 32, fontWeight: 800, color: T.text, margin: "0 0 5px", lineHeight: 1.1 }}>{game.title}</h1>
          <div style={{ fontSize: 13, color: T.ts }}>{game.dev} · {game.year} · {game.plat.join(", ")}</div>
        </div>
      </div>

      <div style={{ maxWidth: 680, paddingTop: 26 }}>
        {/* Score card + description */}
        <div style={{ display: "flex", gap: 20, marginBottom: 26, alignItems: "flex-start" }}>
          <div style={{ background: T.card, border: `1px solid ${T.bord}`, borderRadius: 10, padding: "15px 20px", textAlign: "center", flexShrink: 0 }}>
            <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 28, fontWeight: 800, color: T.amber, lineHeight: 1 }}>★ {game.score}</div>
            <div style={{ fontSize: 10, color: T.tm, marginTop: 5, textTransform: "uppercase", letterSpacing: "0.08em" }}>Community</div>
          </div>
          <p style={{ color: T.ts, fontSize: 14, lineHeight: 1.8, margin: 0, paddingTop: 2 }}>{game.desc}</p>
        </div>

        <div style={{ height: 1, background: T.bord, marginBottom: 26 }} />

        {/* Entry form */}
        <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 15, fontWeight: 700, color: T.text, marginBottom: 20 }}>
          {entry ? "Update your entry" : "Add to your list"}
        </div>

        <div style={{ display: "grid", gap: 20 }}>
          {/* Status selector */}
          <div>
            <div style={{ fontSize: 10, color: T.tm, marginBottom: 9, textTransform: "uppercase", letterSpacing: "0.08em" }}>Status</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {Object.entries(ST).map(([v, s]) => (
                <button key={v} onClick={() => setStatus(v)} style={{
                  padding: "7px 14px", borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: "pointer",
                  border: `1px solid ${status === v ? s.color : T.bord}`,
                  background: status === v ? s.bg : "transparent",
                  color: status === v ? s.color : T.tm,
                  transition: "all 0.12s",
                }}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Score selector */}
          <div>
            <div style={{ fontSize: 10, color: T.tm, marginBottom: 9, textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Your score{score > 0 ? ` · ${score}/10` : " · not rated yet"}
            </div>
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
              {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
                <button key={n} onClick={() => setScore(score === n ? 0 : n)} style={{
                  width: 37, height: 33, borderRadius: 5, fontSize: 12, fontWeight: 600, cursor: "pointer",
                  border: `1px solid ${score >= n ? T.amber : T.bord}`,
                  background: score >= n ? "rgba(245,158,11,0.15)" : "transparent",
                  color: score >= n ? T.amber : T.tm,
                  transition: "all 0.1s",
                }}>
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* Hours played */}
          <div>
            <div style={{ fontSize: 10, color: T.tm, marginBottom: 9, textTransform: "uppercase", letterSpacing: "0.08em" }}>Hours played</div>
            <input
              type="number" min="0" value={hours}
              onChange={e => setHours(Math.max(0, Number(e.target.value)))}
              style={{ width: 110, padding: "8px 10px", borderRadius: 6, border: `1px solid ${T.bord}`, background: T.card, color: T.text, fontSize: 13, outline: "none" }}
            />
          </div>

          {/* Notes */}
          <div>
            <div style={{ fontSize: 10, color: T.tm, marginBottom: 9, textTransform: "uppercase", letterSpacing: "0.08em" }}>Notes (optional)</div>
            <textarea
              value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Add personal notes, thoughts, review..."
              rows={3}
              style={{ width: "100%", padding: "10px 12px", borderRadius: 6, border: `1px solid ${T.bord}`, background: T.card, color: T.text, fontSize: 13, resize: "vertical", outline: "none" }}
            />
          </div>

          {/* Action buttons */}
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => onSave({ status, score, hours, notes })}
              style={{ padding: "11px 20px", borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: "pointer", border: "none", background: T.accentB, color: "#fff", flex: 1 }}
            >
              {entry ? "Update entry" : "Add to list"}
            </button>
            {entry && (
              <button
                onClick={onRemove}
                style={{ padding: "11px 16px", borderRadius: 7, fontSize: 13, cursor: "pointer", border: "1px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.08)", color: T.red }}
              >
                Remove
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── App root ─────────────────────────────────────────────────────────────────

export default function App() {
  const [page,     setPage]    = useState("browse"); // "browse" | "mylist" | "detail"
  const [prevPage, setPrev]    = useState("browse");
  const [selGame,  setSel]     = useState(null);
  const [userList, setList]    = useState([]);

  const listMap = useMemo(() => Object.fromEntries(userList.map(e => [e.id, e])), [userList]);
  const gameMap = useMemo(() => Object.fromEntries(GAMES.map(g => [g.id, g])),   []);

  const openGame = (game) => { setPrev(page); setSel(game); setPage("detail"); };
  const goBack   = ()     => { setPage(prevPage); setSel(null); };

  const saveEntry = ({ status, score, hours, notes }) => {
    setList(prev => {
      const ex    = prev.find(e => e.id === selGame.id);
      const entry = { id: selGame.id, status, score, hours, notes, dateAdded: ex?.dateAdded || Date.now() };
      return ex ? prev.map(e => e.id === selGame.id ? entry : e) : [...prev, entry];
    });
    goBack();
  };

  const removeEntry = () => { setList(prev => prev.filter(e => e.id !== selGame.id)); goBack(); };

  const navBtn = (p, label) => {
    const active = page === p || (page === "detail" && prevPage === p);
    return (
      <button
        onClick={() => { setSel(null); setPage(p); }}
        style={{
          padding: "5px 14px", borderRadius: 6, fontSize: 13, fontWeight: 500, cursor: "pointer", border: "none",
          background: active ? T.accentDim : "transparent",
          color:      active ? T.accent    : T.ts,
          transition: "all 0.12s",
        }}
      >
        {label}
      </button>
    );
  };

  return (
    <div style={{ minHeight: "100vh", background: T.bg, fontFamily: "'DM Sans',sans-serif", color: T.text }}>
      {/* Navbar */}
      <nav style={{ background: T.surface, borderBottom: `1px solid ${T.bord}`, position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 20px", display: "flex", alignItems: "center", height: 56, gap: 4 }}>
          <div
            onClick={() => { setSel(null); setPage("browse"); }}
            style={{ fontFamily: "'Syne',sans-serif", fontSize: 18, fontWeight: 800, color: T.text, marginRight: 22, cursor: "pointer", display: "flex", alignItems: "center", gap: 7 }}
          >
            <span style={{ color: T.accent, fontSize: 13 }}>▶</span> GameVault
          </div>
          {navBtn("browse", "🎮 Browse")}
          {navBtn("mylist", `📋 My List${userList.length ? ` (${userList.length})` : ""}`)}
          <div style={{ marginLeft: "auto", fontSize: 12, color: T.tm }}>
            {userList.length > 0 && `${userList.length} game${userList.length !== 1 ? "s" : ""} tracked`}
          </div>
        </div>
      </nav>

      {/* Main content */}
      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "0 20px" }}>
        {page === "detail" && selGame ? (
          <DetailPage
            game={selGame}
            entry={listMap[selGame.id]}
            onBack={goBack}
            onSave={saveEntry}
            onRemove={removeEntry}
          />
        ) : page === "mylist" ? (
          <MyListPage userList={userList} gameMap={gameMap} onOpen={openGame} />
        ) : (
          <BrowsePage games={GAMES} listMap={listMap} onOpen={openGame} />
        )}
      </main>
    </div>
  );
}
