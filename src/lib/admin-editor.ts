import { z } from "zod";
import { getStartLetter, getEndLetter, isUrduLetter, isAttackLetter } from "./urdu";

export const editShairSchema = z.object({
  id: z.string().uuid(),
  text_urdu: z.string().trim().min(3),
  poet_id: z.string().uuid().nullable().optional(),
  book_id: z.string().uuid().nullable().optional(),
  page_number: z.number().int().positive().nullable().optional(),
});

export function shairEditPatch(input: z.infer<typeof editShairSchema>) {
  const data = editShairSchema.parse(input);
  const start = getStartLetter(data.text_urdu);
  const end = getEndLetter(data.text_urdu);
  if (!isUrduLetter(start) || !isUrduLetter(end)) throw new Error("Could not detect Urdu start/end letters");
  return {
    text_urdu: data.text_urdu,
    start_letter: start,
    end_letter: end,
    is_attack: isAttackLetter(end),
    ...(data.poet_id !== undefined ? { poet_id: data.poet_id } : {}),
    ...(data.book_id !== undefined ? { book_id: data.book_id } : {}),
    ...(data.page_number !== undefined ? { page_number: data.page_number } : {}),
  };
}

// Use bounded requests instead of relying on the Data API's maximum row limit.
export async function readAllEditorRows<T>(read: (from: number, to: number) => Promise<T[]>) {
  const rows: T[] = [];
  const size = 500;
  for (let from = 0; ; from += size) {
    const batch = await read(from, from + size - 1);
    rows.push(...batch);
    if (batch.length < size) return rows;
  }
}