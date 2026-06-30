// All of GameVault's talk with its OWN backend lives here — the same way
// rawg.ts holds every RAWG call. Keeping it in one place means the server URL
// is written once, and components never deal with fetch details directly.
import type { Entry } from "./types";

const API = "http://localhost:3001/api";

// Load the whole saved list. Called once when the app starts.
export async function fetchList(): Promise<Entry[]> {
  const response = await fetch(`${API}/list`);
  if (!response.ok) {
    throw new Error("Couldn't load your list (" + response.status + ")");
  }
  return response.json();
}

// Add or update one entry, and return the entry the server saved.
export async function postEntry(entry: Entry): Promise<Entry> {
  const response = await fetch(`${API}/list`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(entry),
  });
  if (!response.ok) {
    throw new Error("Couldn't save the entry (" + response.status + ")");
  }
  return response.json();
}

// Remove one game from the list by its id. A 404 (already gone) is fine.
export async function deleteEntry(id: number): Promise<void> {
  const response = await fetch(`${API}/list/${id}`, { method: "DELETE" });
  if (!response.ok && response.status !== 404) {
    throw new Error("Couldn't remove the entry (" + response.status + ")");
  }
}
