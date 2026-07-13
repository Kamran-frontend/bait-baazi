import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { z } from "zod";

function sbPublic() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env");
  return createClient<Database>(url, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
}

const Input = z.object({
  startLetter: z.string().min(1),
  usedIds: z.array(z.string()).default([]),
  difficulty: z.enum(["easy", "medium", "hard", "expert"]).default("medium"),
});

export const getAiReply = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data }) => {
    const supabase = sbPublic();
    let query = supabase.from("shair")
      .select("id, text_urdu, start_letter, end_letter, is_attack, difficulty, popularity, poet:poets(name_urdu)")
      .eq("start_letter", data.startLetter)
      .eq("approved", true);
    if (data.usedIds.length > 0) query = query.not("id", "in", `(${data.usedIds.join(",")})`);
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

export const verifyShair = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ text: z.string().min(3) }).parse(d))
  .handler(async ({ data }) => {
    const supabase = sbPublic();
    const snippet = data.text.trim().replace(/\s+/g, " ").slice(0, 40);
    const { data: rows } = await supabase.from("shair")
      .select("id, text_urdu, poet:poets(name_urdu)")
      .ilike("text_urdu", `%${snippet}%`)
      .limit(1);
    return { verified: (rows?.length ?? 0) > 0, match: rows?.[0] ?? null };
  });

/** Random shair for practice mode. */
export const getRandomShair = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({
    startLetter: z.string().optional(),
    excludeIds: z.array(z.string()).default([]),
  }).parse(d))
  .handler(async ({ data }) => {
    const supabase = sbPublic();
    let q = supabase.from("shair")
      .select("id, text_urdu, start_letter, end_letter, is_attack, poet:poets(name_urdu), book:books(title_urdu)")
      .eq("approved", true);
    if (data.startLetter) q = q.eq("start_letter", data.startLetter);
    if (data.excludeIds.length) q = q.not("id", "in", `(${data.excludeIds.join(",")})`);
    const { data: rows, error } = await q.limit(50);
    if (error) throw new Error(error.message);
    if (!rows?.length) return { ok: false as const };
    return { ok: true as const, shair: rows[Math.floor(Math.random() * rows.length)] };
  });

/**
 * AI-powered search: converts a Roman-Urdu (or English) query to Urdu keyword
 * candidates via Lovable AI Gateway, then searches the shair library.
 */
export const aiSearch = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ query: z.string().min(1) }).parse(d))
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("Missing LOVABLE_API_KEY");

    const sys = `You transliterate Roman-Urdu / English queries into Urdu (Nastaliq) search keywords for a poetry database. Return ONLY a JSON object of the form {"keywords":["...","..."]} with 2-6 short Urdu keyword variants (single words or 2-word phrases) that would help find matching Urdu shair. No explanation.`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: sys },
          { role: "user", content: data.query },
        ],
        response_format: { type: "json_object" },
      }),
    });
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      if (res.status === 429) throw new Error("AI rate limit — please retry shortly");
      if (res.status === 402) throw new Error("AI credits exhausted — add credits to continue");
      throw new Error(`AI error ${res.status}: ${t}`);
    }
    const json = await res.json();
    let keywords: string[] = [];
    try {
      const parsed = JSON.parse(json.choices?.[0]?.message?.content ?? "{}");
      keywords = Array.isArray(parsed.keywords) ? parsed.keywords.filter((k: unknown) => typeof k === "string") : [];
    } catch { /* noop */ }
    if (keywords.length === 0) keywords = [data.query];

    const supabase = sbPublic();
    const results: Record<string, any> = {};
    for (const kw of keywords.slice(0, 6)) {
      const { data: rows } = await supabase.from("shair")
        .select("id, text_urdu, poet_id, book_id, page_number, start_letter, end_letter, category, difficulty, popularity, is_attack, source, poet:poets(name_urdu, name_english), book:books(title_urdu)")
        .ilike("text_urdu", `%${kw}%`)
        .limit(20);
      for (const r of rows ?? []) results[r.id] = r;
    }
    return { keywords, results: Object.values(results) };
  });
