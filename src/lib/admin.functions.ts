import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { getStartLetter, getEndLetter, isUrduLetter, isAttackLetter } from "@/lib/urdu";

/** Bootstrap: if no admin exists yet, grant the caller the admin role. */
export const claimAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { count } = await supabaseAdmin.from("user_roles").select("id", { count: "exact", head: true }).eq("role", "admin");
    if ((count ?? 0) > 0) {
      const { data: mine } = await supabaseAdmin.from("user_roles").select("id").eq("user_id", context.userId).eq("role", "admin").maybeSingle();
      if (mine) return { ok: true, alreadyAdmin: true };
      throw new Error("An admin already exists.");
    }
    const { error } = await supabaseAdmin.from("user_roles").insert({ user_id: context.userId, role: "admin" });
    if (error) throw new Error(error.message);
    return { ok: true, alreadyAdmin: false };
  });

export const myRole = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.from("user_roles").select("role").eq("user_id", context.userId);
    return { roles: (data ?? []).map(r => r.role as string), userId: context.userId };
  });

const AddShairInput = z.object({
  text_urdu: z.string().min(3),
  poet_name: z.string().optional(),
  book_title: z.string().optional(),
  page_number: z.number().int().nullable().optional(),
  category: z.string().optional(),
  source: z.string().optional(),
});

export const addShair = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => AddShairInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const isAdmin = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin.data) throw new Error("Forbidden");

    const start = getStartLetter(data.text_urdu);
    const end = getEndLetter(data.text_urdu);
    if (!isUrduLetter(start) || !isUrduLetter(end)) throw new Error("Could not detect Urdu start/end letter");

    let poet_id: string | null = null;
    if (data.poet_name?.trim()) {
      const { data: existing } = await supabaseAdmin.from("poets").select("id").eq("name_urdu", data.poet_name.trim()).maybeSingle();
      poet_id = existing?.id ?? null;
      if (!poet_id) {
        const { data: created } = await supabaseAdmin.from("poets").insert({ name_urdu: data.poet_name.trim() }).select("id").single();
        poet_id = created?.id ?? null;
      }
    }
    let book_id: string | null = null;
    if (data.book_title?.trim()) {
      const { data: existing } = await supabaseAdmin.from("books").select("id").eq("title_urdu", data.book_title.trim()).maybeSingle();
      book_id = existing?.id ?? null;
      if (!book_id) {
        const { data: created } = await supabaseAdmin.from("books").insert({ title_urdu: data.book_title.trim(), poet_id }).select("id").single();
        book_id = created?.id ?? null;
      }
    }

    const { data: inserted, error } = await supabaseAdmin.from("shair").insert({
      text_urdu: data.text_urdu.trim(),
      poet_id, book_id,
      page_number: data.page_number ?? null,
      start_letter: start, end_letter: end,
      is_attack: isAttackLetter(end),
      category: data.category ?? null,
      source: data.source ?? "manual",
      approved: true,
    }).select("id").single();
    if (error) throw new Error(error.message);
    return { id: inserted?.id, start, end };
  });

/** Use Lovable AI to split a large block of Urdu text into individual shair. */
export const extractShairFromText = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    text: z.string().min(20),
    poet_name: z.string().optional(),
    book_title: z.string().optional(),
    source: z.string().optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const isAdmin = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin.data) throw new Error("Forbidden");

    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("Missing LOVABLE_API_KEY");

    const prompt = `You are an Urdu poetry expert. From the raw Urdu text below (may be extracted from a PDF book), identify every individual SHAIR (couplet — two hemistiches / misras). Ignore prose, headings, page numbers, publisher info, and table of contents. Preserve original Urdu spelling. Return JSON only.

Return a JSON object like: {"shair": [{"text": "misra1\\nmisra2", "category": "romantic|classical|religious|philosophical|other"}]}

Text:
"""
${data.text.slice(0, 15000)}
"""`;

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": apiKey },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      }),
    });
    if (!resp.ok) {
      const t = await resp.text();
      throw new Error(`AI error ${resp.status}: ${t.slice(0, 200)}`);
    }
    const json = await resp.json() as { choices?: { message?: { content?: string } }[] };
    const content = json.choices?.[0]?.message?.content ?? "{}";
    let parsed: { shair?: { text: string; category?: string }[] };
    try { parsed = JSON.parse(content); } catch { throw new Error("AI returned invalid JSON"); }

    const items = parsed.shair ?? [];
    if (items.length === 0) return { inserted: 0, items: [] };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let poet_id: string | null = null;
    if (data.poet_name?.trim()) {
      const { data: existing } = await supabaseAdmin.from("poets").select("id").eq("name_urdu", data.poet_name.trim()).maybeSingle();
      poet_id = existing?.id ?? null;
      if (!poet_id) {
        const { data: created } = await supabaseAdmin.from("poets").insert({ name_urdu: data.poet_name.trim() }).select("id").single();
        poet_id = created?.id ?? null;
      }
    }
    let book_id: string | null = null;
    if (data.book_title?.trim()) {
      const { data: existing } = await supabaseAdmin.from("books").select("id").eq("title_urdu", data.book_title.trim()).maybeSingle();
      book_id = existing?.id ?? null;
      if (!book_id) {
        const { data: created } = await supabaseAdmin.from("books").insert({ title_urdu: data.book_title.trim(), poet_id }).select("id").single();
        book_id = created?.id ?? null;
      }
    }

    const rows = items
      .map(item => {
        const text = item.text?.trim();
        if (!text) return null;
        const start = getStartLetter(text);
        const end = getEndLetter(text);
        if (!isUrduLetter(start) || !isUrduLetter(end)) return null;
        return {
          text_urdu: text,
          poet_id, book_id,
          start_letter: start, end_letter: end,
          is_attack: isAttackLetter(end),
          category: item.category ?? null,
          source: data.source ?? "ai-extract",
          approved: true,
        };
      })
      .filter((v): v is NonNullable<typeof v> => v !== null);

    if (rows.length === 0) return { inserted: 0, items: [] };

    // Deduplicate against existing (by exact text)
    const texts = rows.map(r => r.text_urdu);
    const { data: existing } = await supabaseAdmin.from("shair").select("text_urdu").in("text_urdu", texts);
    const existingSet = new Set((existing ?? []).map(r => r.text_urdu));
    const fresh = rows.filter(r => !existingSet.has(r.text_urdu));
    if (fresh.length === 0) return { inserted: 0, items: [], duplicates: rows.length };

    const { error } = await supabaseAdmin.from("shair").insert(fresh);
    if (error) throw new Error(error.message);
    return { inserted: fresh.length, duplicates: rows.length - fresh.length, items: fresh.map(f => ({ text: f.text_urdu, start: f.start_letter, end: f.end_letter })) };
  });

export const deleteShair = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const isAdmin = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin.data) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("shair").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
