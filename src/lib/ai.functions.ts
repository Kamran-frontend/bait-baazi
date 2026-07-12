import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { z } from "zod";

const Input = z.object({
  startLetter: z.string().min(1),
  usedIds: z.array(z.string()).default([]),
  difficulty: z.enum(["easy", "medium", "hard", "expert"]).default("medium"),
});

/** AI opponent: pick a shair from the library starting with the given letter. */
export const getAiReply = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data }) => {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key) throw new Error("Missing Supabase env");
    const supabase = createClient<Database>(url, key, {
      auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    });

    let query = supabase.from("shair")
      .select("id, text_urdu, start_letter, end_letter, is_attack, difficulty, popularity, poet:poets(name_urdu)")
      .eq("start_letter", data.startLetter)
      .eq("approved", true);

    if (data.usedIds.length > 0) query = query.not("id", "in", `(${data.usedIds.join(",")})`);

    // Difficulty ordering: expert = prefer attack shair; easy = popular non-attack
    const { data: rows, error } = await query.limit(50);
    if (error) throw new Error(error.message);
    if (!rows || rows.length === 0) return { ok: false as const };

    const pool = rows.slice();
    let pick;
    if (data.difficulty === "expert" || data.difficulty === "hard") {
      const attacks = pool.filter(r => r.is_attack);
      pick = (attacks.length ? attacks : pool)[Math.floor(Math.random() * (attacks.length ? attacks.length : pool.length))];
    } else if (data.difficulty === "easy") {
      pool.sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0));
      pick = pool[0];
    } else {
      pick = pool[Math.floor(Math.random() * pool.length)];
    }

    return { ok: true as const, shair: pick };
  });

/** Check whether a player-typed shair matches something in the library (fuzzy). */
export const verifyShair = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ text: z.string().min(3) }).parse(d))
  .handler(async ({ data }) => {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key) throw new Error("Missing Supabase env");
    const supabase = createClient<Database>(url, key, {
      auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    });
    // take a distinctive middle chunk to fuzzy match
    const snippet = data.text.trim().replace(/\s+/g, " ").slice(0, 40);
    const { data: rows } = await supabase.from("shair")
      .select("id, text_urdu, poet:poets(name_urdu)")
      .ilike("text_urdu", `%${snippet}%`)
      .limit(1);
    return { verified: (rows?.length ?? 0) > 0, match: rows?.[0] ?? null };
  });
