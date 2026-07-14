// Urdu / Farsi / Arabic language helpers for Bait Baazi.
// Design goals:
//  1. Preserve diacritics (zair/zabar/pesh/tashdid) and Arabic/Farsi words
//     in stored text — normalization only runs when we DETECT the start /
//     end letter.
//  2. Distinguish letters that a Bait Baazi player must reply with. In
//     particular, keep ں (noon ghunna) separate from ن, and keep ے (bari
//     ye) separate from ی. Mixing them is wrong for gameplay.

// Standard Urdu alphabet (38 letters). Order roughly matches conventional
// tables. We include ں and ے as first-class letters.
export const URDU_LETTERS = [
  "ا","ب","پ","ت","ٹ","ث","ج","چ","ح","خ",
  "د","ڈ","ذ","ر","ڑ","ز","ژ","س","ش","ص",
  "ض","ط","ظ","ع","غ","ف","ق","ک","گ","ل",
  "م","ن","ں","و","ہ","ء","ی","ے",
] as const;

export type UrduLetter = typeof URDU_LETTERS[number];

// Hard ending letters — force a difficult reply.
export const ATTACK_LETTERS = ["ث","ذ","ژ","ض","ظ","غ","ء","ں"] as const;

// Diacritics: harakat (fatha, kasra, damma, sukun, shadda, madd, tanween,
// hamza-above, small alef, etc.). Stripped ONLY for letter detection.
const DIACRITICS_RE = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u08D3-\u08FF\uFE70-\uFE7F]/g;

// Non-letter symbols we skip while scanning for the first / last letter.
const NON_LETTER_RE = /[\s\u060C\u061B\u061F\u2000-\u206F\u2E00-\u2E7F!-@\[-`{-~،؟؛۔:!.,()"'*«»\-—–…]/g;

// Fold Arabic / Farsi variants that a Nastaliq reader treats as the same
// Urdu letter. Deliberately NOT folded: ں (noon ghunna), ے (bari ye),
// because Bait Baazi treats them as their own reply letters.
const NORMALIZE_MAP: Record<string, string> = {
  // Yeh family — Arabic / final forms → Urdu ی (but NOT ے)
  "ي": "ی", "ى": "ی", "ﯼ": "ی", "ﯾ": "ی", "ﯽ": "ی", "ﯿ": "ی",
  // Kaf family
  "ك": "ک", "ﮐ": "ک", "ﮑ": "ک",
  // Heh family → Urdu ہ (also the Arabic ta marbuta)
  "ة": "ہ", "ۃ": "ہ", "ه": "ہ", "ﻩ": "ہ", "ﻫ": "ہ", "ﮫ": "ہ",
  // Alef family — all hamzated / madda / wasla alefs → ا for start-letter matching
  "أ": "ا", "إ": "ا", "آ": "ا", "ٱ": "ا", "ﺁ": "ا", "ﺃ": "ا", "ﺇ": "ا",
  // Hamza carriers
  "ؤ": "و",
  "ئ": "ی",
};

/** Fold Arabic/Farsi variants to their Urdu equivalents, keeping diacritics. */
export function foldVariants(text: string): string {
  let out = "";
  for (const ch of text) out += NORMALIZE_MAP[ch] ?? ch;
  return out;
}

/** Normalize for detection: fold variants + strip diacritics. */
export function normalizeUrdu(text: string): string {
  return foldVariants(text).replace(DIACRITICS_RE, "");
}

/** Strip everything except recognizable Urdu letters. */
export function stripToLetters(text: string): string {
  return normalizeUrdu(text).replace(NON_LETTER_RE, "");
}

/** First Urdu letter of the shair (start letter for Bait Baazi). */
export function getStartLetter(shair: string): string {
  const letters = stripToLetters(shair);
  for (const ch of letters) {
    if (isUrduLetter(ch)) return ch;
  }
  return "";
}

/**
 * Final Urdu letter for Bait Baazi.
 * Walks from the very end (after diacritic strip) and returns the last
 * recognizable letter — this correctly distinguishes ں from ن and ے from ی.
 */
export function getEndLetter(shair: string): string {
  const letters = stripToLetters(shair);
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
  if (["ا","ب","د","م","ن","ی","ہ","ک","ل","و","ت","س","ر","ے"].includes(letter)) return "آسان";
  return "درمیانہ";
}

/** True if the character is any Urdu / Arabic / Farsi script character. */
export function isArabicScript(ch: string): boolean {
  const c = ch.codePointAt(0) ?? 0;
  return (c >= 0x0600 && c <= 0x06FF) || (c >= 0x0750 && c <= 0x077F) ||
         (c >= 0x08A0 && c <= 0x08FF) || (c >= 0xFB50 && c <= 0xFDFF) ||
         (c >= 0xFE70 && c <= 0xFEFF);
}
