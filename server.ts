/*
 * GameVault backend — Stage 3
 * ---------------------------------------------------------------------------
 * A small Node + Express server whose only job is to give "My List" a
 * permanent home. The React app talks to it over HTTP; this server reads and
 * writes a single SQLite file (gamevault.db) so the list survives refreshes,
 * browser restarts, everything.
 *
 * The four things the frontend can ask for:
 *   GET    /api/list        ->  the whole list   (called once when the app loads)
 *   POST   /api/list        ->  add a game
 *   PATCH  /api/list/:id    ->  edit a game's status / score / hours
 *   DELETE /api/list/:id    ->  remove a game
 */

import express from "express";
import cors from "cors";
import Database from "better-sqlite3";

// The shape of one row in our database. Defining it once lets TypeScript check
// every read and keeps the rest of the file honest about what a list item is.
interface ListRow {
  id: number;            // the RAWG game id — also our primary key
  name: string;
  cover: string | null;  // background_image URL from RAWG
  rating: number | null; // RAWG's community rating
  released: string | null;
  status: string;        // the user's own status: planning / playing / completed ...
  score: number | null;  // the user's own 0–10 score
  hours: number | null;  // hours played
  added_at: string;      // when it was added (set automatically)
}

// ---------------------------------------------------------------------------
// 1. The database
// ---------------------------------------------------------------------------
// better-sqlite3 opens (or creates) one file on disk. There is no separate
// database server to start — the whole database IS this gamevault.db file,
// which appears next to this script the first time the server runs.
const db = new Database("gamevault.db");

// Create the table on first run. "IF NOT EXISTS" makes this safe to run on
// every startup: it builds the table once and quietly does nothing afterward.
// One row = one game on the user's list.
db.exec(`
  CREATE TABLE IF NOT EXISTS list (
    id        INTEGER PRIMARY KEY,
    name      TEXT    NOT NULL,
    cover     TEXT,
    rating    REAL,
    released  TEXT,
    status    TEXT    NOT NULL DEFAULT 'planning',
    score     INTEGER,
    hours     REAL,
    added_at  TEXT    NOT NULL DEFAULT (datetime('now'))
  )
`);

// ---------------------------------------------------------------------------
// 2. The web server
// ---------------------------------------------------------------------------
const app = express();

// The frontend runs on http://localhost:5173 and this server on 3001. Because
// those are different origins (the port counts), the browser blocks the
// requests unless the server says "I trust that origin." This is that.
app.use(cors({ origin: "http://localhost:5173" }));

// Let Express understand JSON request bodies, so `req.body` is filled in on
// POST and PATCH instead of being undefined.
app.use(express.json());

// ---------------------------------------------------------------------------
// 3. The endpoints
// ---------------------------------------------------------------------------

// GET /api/list — hand back every game on the list, most recently added first.
app.get("/api/list", (_req, res) => {
  const rows = db
    .prepare("SELECT * FROM list ORDER BY added_at DESC")
    .all() as ListRow[];
  res.json(rows);
});

// POST /api/list — add a game. The frontend sends the game's details as JSON.
app.post("/api/list", (req, res) => {
  const { id, name, cover, rating, released, status, score, hours } = req.body;

  // A game needs at least an id and a name to be worth saving.
  if (!id || !name) {
    return res.status(400).json({ error: "id and name are required" });
  }

  // "INSERT OR REPLACE" means: if this game id is already on the list, just
  // overwrite the old row instead of throwing an error. Adding the same game
  // twice then becomes harmless rather than a crash.
  db.prepare(
    `INSERT OR REPLACE INTO list (id, name, cover, rating, released, status, score, hours)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    name,
    cover ?? null,
    rating ?? null,
    released ?? null,
    status ?? "planning", // fall back to a sensible default if none was sent
    score ?? null,
    hours ?? null
  );

  // Read the saved row back and return it, so the frontend can show the new
  // entry immediately without guessing what got stored.
  const saved = db.prepare("SELECT * FROM list WHERE id = ?").get(id) as ListRow;
  res.status(201).json(saved);
});

// PATCH /api/list/:id — update the three editable tracker fields for one game.
// This is what fires when the user changes a status, score, or hours in the table.
app.patch("/api/list/:id", (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare("SELECT * FROM list WHERE id = ?").get(id) as
    | ListRow
    | undefined;

  if (!existing) {
    return res.status(404).json({ error: "that game is not on the list" });
  }

  // Only these three fields can change. For anything the frontend left out, we
  // keep the existing value — so sending just one field (a partial edit) works.
  const status = req.body.status ?? existing.status;
  const score = req.body.score ?? existing.score;
  const hours = req.body.hours ?? existing.hours;

  db.prepare("UPDATE list SET status = ?, score = ?, hours = ? WHERE id = ?").run(
    status,
    score,
    hours,
    id
  );

  const updated = db.prepare("SELECT * FROM list WHERE id = ?").get(id) as ListRow;
  res.json(updated);
});

// DELETE /api/list/:id — remove a game from the list.
app.delete("/api/list/:id", (req, res) => {
  const id = Number(req.params.id);
  const result = db.prepare("DELETE FROM list WHERE id = ?").run(id);

  // `result.changes` is the number of rows deleted. Zero means the game wasn't
  // on the list in the first place, so we report that rather than pretend.
  if (result.changes === 0) {
    return res.status(404).json({ error: "that game is not on the list" });
  }

  res.status(204).end(); // 204 = success, with nothing to send back.
});

// ---------------------------------------------------------------------------
// 4. Start listening
// ---------------------------------------------------------------------------
const PORT = 3001;
app.listen(PORT, () => {
  console.log(`GameVault backend running at http://localhost:${PORT}`);
});
