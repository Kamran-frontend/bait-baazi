import { describe, expect, test } from "bun:test";
import { shairEditPatch, readAllEditorRows } from "./admin-editor";

const id = "00000000-0000-4000-8000-000000000001";
describe("manual shair corrections", () => {
  test("corrects letters without replacing the unique reference or import source", () => {
    const patch = shairEditPatch({ id, text_urdu: "  آقا ہم ہیں  " });
    expect(patch.text_urdu).toBe("آقا ہم ہیں");
    expect(patch.start_letter).toBe("ا");
    expect(patch.end_letter).toBe("ن");
    expect(patch).not.toHaveProperty("serial");
    expect(patch).not.toHaveProperty("source");
  });
  test("preserves links and page number when editing only the reading", () => {
    const patch = shairEditPatch({ id, text_urdu: "اللہ کے لیے" });
    expect(patch.end_letter).toBe("ی");
    expect(patch).not.toHaveProperty("poet_id");
    expect(patch).not.toHaveProperty("book_id");
    expect(patch).not.toHaveProperty("page_number");
  });
  test("supports correcting or clearing attribution and page references", () => {
    const patch = shairEditPatch({ id, text_urdu: "اللہ کے لیے", poet_id: id, book_id: null, page_number: 88 });
    expect(patch.poet_id).toBe(id);
    expect(patch.book_id).toBeNull();
    expect(patch.page_number).toBe(88);
  });
  test("invalid input cannot save", () => {
    expect(() => shairEditPatch({ id, text_urdu: "abc" })).toThrow();
    expect(() => shairEditPatch({ id, text_urdu: "اللہ", page_number: 1.5 })).toThrow();
  });
  test("all imported shairs remain available beyond the default API cap", async () => {
    const source = Array.from({ length: 1288 }, (_, i) => i);
    const rows = await readAllEditorRows(async (from, to) => source.slice(from, to + 1));
    expect(rows).toHaveLength(1288);
    expect(rows[1287]).toBe(1287);
  });
});