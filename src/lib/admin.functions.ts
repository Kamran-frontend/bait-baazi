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

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (!isAdmin) throw new Error("Forbidden");
}

async function upsertPoetAndBook(name?: string, book?: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  let poet_id: string | null = null;
  if (name?.trim()) {
    const { data: existing } = await supabaseAdmin.from("poets").select("id").eq("name_urdu", name.trim()).maybeSingle();
    poet_id = existing?.id ?? null;
    if (!poet_id) {
      const { data: created } = await supabaseAdmin.from("poets").insert({ name_urdu: name.trim() }).select("id").single();
      poet_id = created?.id ?? null;
    }
  }
  let book_id: string | null = null;
  if (book?.trim()) {
    const { data: existing } = await supabaseAdmin.from("books").select("id").eq("title_urdu", book.trim()).maybeSingle();
    book_id = existing?.id ?? null;
    if (!book_id) {
      const { data: created } = await supabaseAdmin.from("books").insert({ title_urdu: book.trim(), poet_id }).select("id").single();
      book_id = created?.id ?? null;
    }
  }
  return { poet_id, book_id };
}

const AddShairInput = z.object({
  text_urdu: z.string().min(3),
  poet_name: z.string().optional(),
  book_title: z.string().optional(),
  page_number: z.number().int().nullable().optional(),
  source: z.string().optional(),
});

export const addShair = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => AddShairInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const start = getStartLetter(data.text_urdu);
    const end = getEndLetter(data.text_urdu);
    if (!isUrduLetter(start) || !isUrduLetter(end)) throw new Error("Could not detect Urdu start/end letter");
    const { poet_id, book_id } = await upsertPoetAndBook(data.poet_name, data.book_title);
    const { data: inserted, error } = await supabaseAdmin.from("shair").insert({
      text_urdu: data.text_urdu.trim(),
      poet_id, book_id,
      page_number: data.page_number ?? null,
      start_letter: start, end_letter: end,
      is_attack: isAttackLetter(end),
      source: data.source ?? "manual",
      approved: true,
    }).select("id").single();
    if (error) throw new Error(error.message);
    return { id: inserted?.id, start, end };
  });

export const editShair = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    id: z.string().uuid(),
    text_urdu: z.string().min(3),
    poet_name: z.string().optional(),
    book_title: z.string().optional(),
    page_number: z.number().int().nullable().optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const start = getStartLetter(data.text_urdu);
    const end = getEndLetter(data.text_urdu);
    if (!isUrduLetter(start) || !isUrduLetter(end)) throw new Error("Could not detect start/end letter");
    const { poet_id, book_id } = await upsertPoetAndBook(data.poet_name, data.book_title);
    const patch: Record<string, unknown> = {
      text_urdu: data.text_urdu.trim(),
      start_letter: start, end_letter: end,
      is_attack: isAttackLetter(end),
      page_number: data.page_number ?? null,
    };
    if (poet_id) patch.poet_id = poet_id;
    if (book_id) patch.book_id = book_id;
    const { error } = await supabaseAdmin.from("shair").update(patch).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true, start, end };
  });

export const deleteShair = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("shair").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Recompute start/end letters for every shair using current Urdu logic. */
export const reclassifyAllShair = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let from = 0, updated = 0, failed = 0;
    const PAGE = 500;
    for (;;) {
      const { data: rows, error } = await supabaseAdmin.from("shair").select("id, text_urdu, start_letter, end_letter").range(from, from + PAGE - 1);
      if (error) throw new Error(error.message);
      if (!rows || rows.length === 0) break;
      for (const r of rows) {
        const s = getStartLetter(r.text_urdu);
        const e = getEndLetter(r.text_urdu);
        if (!isUrduLetter(s) || !isUrduLetter(e)) { failed++; continue; }
        if (s === r.start_letter && e === r.end_letter) continue;
        const { error: uErr } = await supabaseAdmin.from("shair").update({
          start_letter: s, end_letter: e, is_attack: isAttackLetter(e),
        }).eq("id", r.id);
        if (uErr) failed++; else updated++;
      }
      if (rows.length < PAGE) break;
      from += PAGE;
    }
    return { updated, failed };
  });

/** Extract shair from a plain Urdu text block (paste from clipboard). */
export const extractShairFromText = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    text: z.string().min(20),
    poet_name: z.string().optional(),
    book_title: z.string().optional(),
    source: z.string().optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("Missing LOVABLE_API_KEY");

    const prompt = `You are an Urdu poetry expert. From the raw text below (may include Urdu, Arabic, or Farsi words and diacritics like zair/zabar/pesh), identify every individual SHAIR (couplet of two misras / hemistiches). Ignore prose, headings, page numbers, publisher info, and table of contents. PRESERVE original spelling AND diacritics exactly as written. Return JSON only.

Return: {"shair":[{"text":"misra1\\nmisra2"}]}

Text:
"""
${data.text.slice(0, 15000)}
"""`;

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      }),
    });
    if (!resp.ok) {
      const t = await resp.text();
      if (resp.status === 429) throw new Error("AI rate limit — retry shortly");
      if (resp.status === 402) throw new Error("AI credits exhausted — add credits");
      throw new Error(`AI error ${resp.status}: ${t.slice(0, 200)}`);
    }
    const json = await resp.json() as { choices?: { message?: { content?: string } }[] };
    const items = safeParseShair(json.choices?.[0]?.message?.content ?? "{}");
    return insertShair(items, data.poet_name, data.book_title, data.source ?? "ai-paste");
  });

/**
 * Upload a PDF and extract every shair with Gemini vision (AI + OCR in one).
 * Client sends base64-encoded PDF; server stores in the `pdfs` bucket and
 * hands the file to Gemini for direct multimodal parsing.
 */
export const uploadAndExtractPdf = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    filename: z.string().min(1),
    base64: z.string().min(100),
    poet_name: z.string().optional(),
    book_title: z.string().optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("Missing LOVABLE_API_KEY");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Persist file
    const path = `${context.userId}/${Date.now()}-${data.filename.replace(/[^\w.\-]+/g, "_")}`;
    const bytes = Uint8Array.from(atob(data.base64), c => c.charCodeAt(0));
    if (bytes.byteLength > 20 * 1024 * 1024) {
      throw new Error("PDF too large — please split into files under 20 MB");
    }
    const { error: upErr } = await supabaseAdmin.storage.from("pdfs").upload(path, bytes, {
      contentType: "application/pdf", upsert: false,
    });
    if (upErr) throw new Error(`Storage upload failed: ${upErr.message}`);

    const { data: upRow } = await supabaseAdmin.from("pdf_uploads").insert({
      filename: data.filename, storage_path: path, uploaded_by: context.userId, status: "processing",
    }).select("id").single();
    const uploadId = upRow?.id as string | undefined;

    try {
      const prompt = `You are an Urdu poetry expert working as an OCR + extractor. This PDF contains an Urdu poetry book (may include Arabic and Farsi words, diacritics such as zair, zabar, pesh, tashdid, madd). Read every page carefully — including scanned/image pages — and identify every complete SHAIR (couplet = two misras / hemistiches).

Rules:
- PRESERVE original Urdu spelling AND all diacritics exactly.
- Keep Arabic and Farsi words as they appear.
- SKIP prose, prefaces, page numbers, indices, publisher notes, headings.
- Only return complete couplets (two misras); skip fragments.
- Deduplicate identical couplets.

Return JSON only in this exact shape:
{"shair":[{"text":"first misra\\nsecond misra","page":12}]}`;

      const dataUrl = `data:application/pdf;base64,${data.base64}`;
      const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: "google/gemini-2.5-pro",
          messages: [{
            role: "user",
            content: [
              { type: "text", text: prompt },
              { type: "file", file: { filename: data.filename, file_data: dataUrl } },
            ],
          }],
          response_format: { type: "json_object" },
        }),
      });
      if (!resp.ok) {
        const t = await resp.text();
        if (resp.status === 429) throw new Error("AI rate limit — retry shortly");
        if (resp.status === 402) throw new Error("AI credits exhausted — add credits");
        throw new Error(`AI error ${resp.status}: ${t.slice(0, 300)}`);
      }
      const json = await resp.json() as { choices?: { message?: { content?: string } }[] };
      const items = safeParseShair(json.choices?.[0]?.message?.content ?? "{}");
      const result = await insertShair(items, data.poet_name, data.book_title, `pdf:${data.filename}`);

      if (uploadId) {
        await supabaseAdmin.from("pdf_uploads").update({
          status: "completed", extracted_count: result.inserted,
        }).eq("id", uploadId);
      }
      return { ...result, uploadId };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "extract failed";
      if (uploadId) {
        await supabaseAdmin.from("pdf_uploads").update({ status: "failed", error_message: msg }).eq("id", uploadId);
      }
      throw e;
    }
  });

function safeParseShair(content: string): { text: string; page?: number | null }[] {
  try {
    const parsed = JSON.parse(content) as { shair?: { text?: string; page?: number | null }[] };
    return (parsed.shair ?? []).filter(x => typeof x.text === "string" && x.text.trim().length > 0) as { text: string; page?: number | null }[];
  } catch { return []; }
}

async function insertShair(items: { text: string; page?: number | null }[], poet_name?: string, book_title?: string, source = "ai") {
  if (items.length === 0) return { inserted: 0, duplicates: 0, items: [] as { text: string; start: string; end: string }[] };
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { poet_id, book_id } = await upsertPoetAndBook(poet_name, book_title);
  const rows = items
    .map(item => {
      const text = item.text.trim();
      if (!text) return null;
      const start = getStartLetter(text);
      const end = getEndLetter(text);
      if (!isUrduLetter(start) || !isUrduLetter(end)) return null;
      return {
        text_urdu: text,
        poet_id, book_id,
        page_number: item.page ?? null,
        start_letter: start, end_letter: end,
        is_attack: isAttackLetter(end),
        source,
        approved: true,
      };
    })
    .filter((v): v is NonNullable<typeof v> => v !== null);
  if (rows.length === 0) return { inserted: 0, duplicates: 0, items: [] };

  const texts = rows.map(r => r.text_urdu);
  const { data: existing } = await supabaseAdmin.from("shair").select("text_urdu").in("text_urdu", texts);
  const existingSet = new Set((existing ?? []).map(r => r.text_urdu));
  const fresh = rows.filter(r => !existingSet.has(r.text_urdu));
  if (fresh.length === 0) return { inserted: 0, duplicates: rows.length, items: [] };
  const { error } = await supabaseAdmin.from("shair").insert(fresh);
  if (error) throw new Error(error.message);
  return {
    inserted: fresh.length,
    duplicates: rows.length - fresh.length,
    items: fresh.map(f => ({ text: f.text_urdu, start: f.start_letter, end: f.end_letter })),
  };
}

/** Admin: fetch open flags with the shair text joined. */
export const listOpenFlags = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("shair_flags")
      .select("id, reason, status, created_at, shair:shair(id, text_urdu, start_letter, end_letter)")
      .eq("status", "open")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const resolveFlag = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    id: z.string().uuid(),
    action: z.enum(["dismiss", "delete_shair"]),
    shair_id: z.string().uuid().optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.action === "delete_shair" && data.shair_id) {
      await supabaseAdmin.from("shair").delete().eq("id", data.shair_id);
    }
    await supabaseAdmin.from("shair_flags").update({ status: "resolved" }).eq("id", data.id);
    return { ok: true };
  });
