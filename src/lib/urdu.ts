// Urdu language helpers

export const URDU_LETTERS = [
  "ا","ب","پ","ت","ٹ","ث","ج","چ","ح","خ",
  "د","ڈ","ذ","ر","ڑ","ز","ژ","س","ش","ص",
  "ض","ط","ظ","ع","غ","ف","ق","ک","گ","ل",
  "م","ن","و","ہ","ء","ی",
] as const;

export type UrduLetter = typeof URDU_LETTERS[number];

// Difficult ending letters — "attack" letters that force the opponent to reply with them
export const ATTACK_LETTERS = ["ث","ذ","ژ","ض","ظ","غ","ء"] as const;

// Diacritics / marks to strip: harakat (fatha, kasra, damma, sukun, shadda, madd, hamza on top, etc.)
const DIACRITICS_RE = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g;
// Punctuation and non-letter symbols
const NON_LETTER_RE = /[\s\u060C\u061B\u061F\u2000-\u206F\u2E00-\u2E7F!-@\[-`{-~،؟؛۔:!.,()"'*«»]/g;

// Normalize equivalent forms
const NORMALIZE_MAP: Record<string, string> = {
  "ي": "ی", "ى": "ی", "ﯼ": "ی", "ے": "ی",
  "ك": "ک",
  "ة": "ہ", "ۃ": "ہ", "ه": "ہ",
  "أ": "ا", "إ": "ا", "آ": "ا", "ٱ": "ا",
  "ؤ": "و",
  "ئ": "ی",
};

export function normalizeUrdu(text: string): string {
  const stripped = text.replace(DIACRITICS_RE, "");
  let out = "";
  for (const ch of stripped) {
    out += NORMALIZE_MAP[ch] ?? ch;
  }
  return out;
}

export function stripToLetters(text: string): string {
  return normalizeUrdu(text).replace(NON_LETTER_RE, "");
}

/** First Urdu letter of the shair (start letter for Bait Baazi). */
export function getStartLetter(shair: string): string {
  const letters = stripToLetters(shair);
  const first = letters[0] ?? "";
  return isUrduLetter(first) ? first : "";
}

/** Final Urdu letter used for the next player's turn. */
export function getEndLetter(shair: string): string {
  const letters = stripToLetters(shair);
  // Walk from end for the last recognizable Urdu letter
  for (let i = letters.length - 1; i >= 0; i--) {
    const ch = letters[i];
    if (isUrduLetter(ch)) return ch;
  }
  return "";
}

export function isUrduLetter(ch: string): ch is UrduLetter {
  return (URDU_LETTERS as readonly string[]).includes(ch);
}

export function isAttackLetter(letter: string): boolean {
  return (ATTACK_LETTERS as readonly string[]).includes(letter);
}

export function letterDifficulty(letter: string): "آسان" | "درمیانہ" | "مشکل" {
  if (isAttackLetter(letter)) return "مشکل";
  if (["ا","ب","د","م","ن","ی","ہ","ک","ل","و","ت","س","ر"].includes(letter)) return "آسان";
  return "درمیانہ";
}
