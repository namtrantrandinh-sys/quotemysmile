/**
 * AHPRA copy filter — client-side soft warning before submit.
 *
 * Mirrors NOTE_BLOCKED_TERMS from lib/copy.ts. Returns the matched terms
 * so the UI can surface them in a warning prompt.
 *
 * IMPORTANT: This is also enforced server-side via the
 * check_quote_note_terms() trigger in migration 0006. Never trust the client.
 */
import { NOTE_BLOCKED_TERMS } from "./copy";

export type AhpraScan = {
  ok: boolean;
  matches: string[];
};

export function scanNote(note: string | undefined | null): AhpraScan {
  if (!note) return { ok: true, matches: [] };
  const lower = note.toLowerCase();
  const matches = NOTE_BLOCKED_TERMS.filter((term) => lower.includes(term.toLowerCase()));
  return { ok: matches.length === 0, matches };
}
