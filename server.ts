/*
 * GameVault backend — Stage 3
 * ---------------------------------------------------------------------------
 * A small Node + Express server whose only job is to give "My List" a
 * permanent home. The React app talks to it over HTTP; this server reads and
 * writes a single SQLite file (gamevault.db) so the list survives refreshes,
 * browser restarts, everything.
 *
 * It mirrors how the frontend already works:
 *   - The frontend stores the list as Entry objects (gameId, status, score,
 *     hours, and the FULL game object bundled in).
 *   - Its saveEntry() is one "upsert" used both to add a game and to edit one.
 * So the server needs just three routes:
 *   GET    /api/list        ->  the whole list   (called once when the app loads)
 *   POST   /api/list        ->  add OR update one entry
 *   DELETE /api/list/:id    ->  remove one game
 */

import express from "express";
import cors from "cors";
import Database from "better-sqlite3";

// One row in the database = one Entry. The three tracking fields get their own
// columns; the whole game object is stored as JSON text in the `game` column.
// Storing the game as JSON lets us hand back the exact object the frontend
// bundled in, so list rows render without re-fetching anything from RAWG.
interface EntryRow {
  game_id: number;
  status: string;
  score: number;
  hours: number;
  game: string; // a JSON string of the Game object
  added_at: string;
}

// better-sqlite3 opens (or creates) one file on disk. There is no separate
// database server to start — the whole database IS this gamevault.db file.
const db = new Database("gamevault.db");

// Create the table on first run. "IF NOT EXISTS" makes this safe to run on
// every startup: it builds the table once and quietly does nothing afterward.
db.exec(`
  CREATE TABLE IF NOT EXISTS list (
    game_id   INTEGER PRIMARY KEY,
    status    TEXT    NOT NULL DEFAULT 'Plan to Play',
    score     INTEGER NOT NULL DEFAULT 0,
    hours     REAL    NOT NULL DEFAULT 0,
    game      TEXT    NOT NULL,
    added_at  TEXT    NOT NULL DEFAULT (datetime('now'))
  )
`);

const app = express();

// The frontend runs on http://localhost:5173 and this server on 3001. Because
// those are different origins (the port counts), the browser blocks the
// requests between them unless the server says "I trust that origin."
app.use(cors({ origin: "http://localhost:5173" }));

// Let Express understand JSON request bodies, so `req.body` is filled in.
app.use(express.json());

// Turn a raw database row back into the Entry shape the frontend expects
// (snake_case columns -> camelCase fields, and the game text -> a real object).
function rowToEntry(row: EntryRow) {
  return {
    gameId: row.game_id,
    status: row.status,
    score: row.score,
    hours: row.hours,
    game: JSON.parse(row.game),
  };
}

// GET /api/list — hand back every saved entry, most recently added first.
app.get("/api/list", (_req, res) => {
  const rows = db
    .prepare("SELECT * FROM list ORDER BY added_at DESC")
    .all() as EntryRow[];
  res.json(rows.map(rowToEntry));
});

// POST /api/list — add OR update one entry. The frontend always sends the whole
// entry (even on a small edit), so a single "insert or replace" covers both
// "add to list" and "change a status / score / hours" with no separate route.
app.post("/api/list", (req, res) => {
  const { gameId, status, score, hours, game } = req.body;

  // An entry needs at least an id and its game object to be worth saving.
  if (!gameId || !game) {
    return res.status(400).json({ error: "gameId and game are required" });
  }

  // "INSERT OR REPLACE" means: if this game is already on the list, overwrite
  // the old row instead of erroring. Saving the same game twice is harmless.
  db.prepare(
    `INSERT OR REPLACE INTO list (game_id, status, score, hours, game)
     VALUES (?, ?, ?, ?, ?)`
  ).run(
    gameId,
    status ?? "Plan to Play",
    score ?? 0,
    hours ?? 0,
    JSON.stringify(game) // store the whole game object as text
  );

  // Read the saved row back and return it, so the frontend has the server's
  // version of the truth.
  const saved = db
    .prepare("SELECT * FROM list WHERE game_id = ?")
    .get(gameId) as EntryRow;
  res.status(201).json(rowToEntry(saved));
});

// DELETE /api/list/:id — remove one game from the list.
app.delete("/api/list/:id", (req, res) => {
  const gameId = Number(req.params.id);
  const result = db.prepare("DELETE FROM list WHERE game_id = ?").run(gameId);

  // `result.changes` is the number of rows deleted. Zero means the game wasn't
  // on the list in the first place, so we say so rather than pretend.
  if (result.changes === 0) {
    return res.status(404).json({ error: "that game is not on the list" });
  }

  res.status(204).end(); // 204 = success, with nothing to send back.
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`GameVault backend running at http://localhost:${PORT}`);
});
