import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { getStartLetter, getEndLetter, isUrduLetter, isAttackLetter } from "@/lib/urdu";

const OWNER_EMAIL = "kamranali130893@gmail.com";

export const myRole = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const email = (context.claims.email as string | undefined)?.toLowerCase();
    // Auto-grant admin for the sole owner if not present yet.
    if (email === OWNER_EMAIL) {
      const { data: mine } = await context.supabase.from("user_roles").select("role").eq("user_id", context.userId).eq("role", "admin").maybeSingle();
      if (!mine) {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        await supabaseAdmin.from("user_roles").upsert({ user_id: context.userId, role: "admin" }, { onConflict: "user_id,role" });
      }
    }
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
  .validator((d: unknown) => AddShairInput.parse(d))
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
  .validator((d: unknown) => z.object({
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
    const patch: {
      text_urdu: string; start_letter: string; end_letter: string;
      is_attack: boolean; page_number: number | null;
      poet_id?: string; book_id?: string;
    } = {
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
  .validator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
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
  .validator((d: unknown) => z.object({
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
 * Extract every shair from one or more uploaded images (photos, screenshots,
 * or scanned pages). Uses Gemini vision (AI + OCR in one) — no PDF needed.
 */
export const extractShairFromImages = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => z.object({
    images: z.array(z.object({
      mime: z.string().min(3),
      base64: z.string().min(100),
    })).min(1).max(10),
    poet_name: z.string().optional(),
    book_title: z.string().optional(),
    source_label: z.string().optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("Missing LOVABLE_API_KEY");

    const prompt = `You are an Urdu poetry expert working as OCR + extractor. Each attached image is a photo, screenshot, or scanned page from an Urdu poetry book (may contain Arabic or Farsi words and diacritics such as zair, zabar, pesh, tashdid, madd). Read every image carefully and identify every complete SHAIR (couplet = two misras / hemistiches).

Rules:
- PRESERVE original Urdu spelling AND all diacritics exactly as they appear.
- Keep Arabic and Farsi words as they appear.
- Carefully distinguish ں (noon ghunna) from ن (regular noon), and ے (bari ye) from ی (choti ye) — these are DIFFERENT letters. Look for the dot(s) below noon and the shape of the final ye.
- SKIP prose, prefaces, headings, page numbers, indices, publisher notes.
- Only return complete couplets (two misras); skip fragments.
- Deduplicate identical couplets.

Return JSON only in this exact shape:
{"shair":[{"text":"first misra\\nsecond misra"}]}`;

    const content: Array<
      | { type: "text"; text: string }
      | { type: "image_url"; image_url: { url: string } }
    > = [{ type: "text", text: prompt }];
    for (const img of data.images) {
      content.push({ type: "image_url", image_url: { url: `data:${img.mime};base64,${img.base64}` } });
    }

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [{ role: "user", content }],
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
    return insertShair(items, data.poet_name, data.book_title, data.source_label ?? "image");
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
  .validator((d: unknown) => z.object({
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

/** Admin: list all users with role + favorite count. */
export const listUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: authList, error } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
    if (error) throw new Error(error.message);
    const users = authList.users;
    const ids = users.map(u => u.id);
    const [{ data: roles }, { data: favs }] = await Promise.all([
      supabaseAdmin.from("user_roles").select("user_id, role").in("user_id", ids),
      supabaseAdmin.from("favorites").select("user_id").in("user_id", ids),
    ]);
    const roleMap = new Map<string, string[]>();
    for (const r of roles ?? []) {
      const arr = roleMap.get(r.user_id) ?? [];
      arr.push(r.role as string); roleMap.set(r.user_id, arr);
    }
    const favCount = new Map<string, number>();
    for (const f of favs ?? []) favCount.set(f.user_id, (favCount.get(f.user_id) ?? 0) + 1);
    return users.map(u => ({
      id: u.id,
      email: u.email ?? null,
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at ?? null,
      banned_until: (u as unknown as { banned_until?: string | null }).banned_until ?? null,
      roles: roleMap.get(u.id) ?? [],
      favorite_count: favCount.get(u.id) ?? 0,
    }));
  });

/** Admin: grant or revoke a role for a user. */
export const setUserRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => z.object({
    user_id: z.string().uuid(),
    role: z.enum(["admin", "user"]),
    grant: z.boolean(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    // Prevent removing your own last admin role by mistake
    if (!data.grant && data.role === "admin" && data.user_id === context.userId) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { count } = await supabaseAdmin.from("user_roles").select("id", { count: "exact", head: true }).eq("role", "admin");
      if ((count ?? 0) <= 1) throw new Error("Cannot remove the only admin");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.grant) {
      const { error } = await supabaseAdmin.from("user_roles").upsert({ user_id: data.user_id, role: data.role }, { onConflict: "user_id,role" });
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabaseAdmin.from("user_roles").delete().eq("user_id", data.user_id).eq("role", data.role);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

/** Admin: ban or unban a user (blocks sign-in). */
export const setUserBanned = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => z.object({
    user_id: z.string().uuid(),
    banned: z.boolean(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (data.user_id === context.userId) throw new Error("Cannot ban yourself");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.user_id, {
      ban_duration: data.banned ? "876000h" : "none",
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Admin: delete a user account entirely. */
export const deleteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => z.object({ user_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (data.user_id === context.userId) throw new Error("Cannot delete yourself");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.user_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Public: submit an inquiry (Contact form). Anyone can submit. */
export const submitInquiry = createServerFn({ method: "POST" })
  .validator((d: unknown) => z.object({
    name: z.string().trim().min(1).max(100),
    email: z.string().trim().email().max(200),
    subject: z.string().trim().max(200).optional(),
    message: z.string().trim().min(3).max(3000),
  }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("inquiries").insert({
      name: data.name, email: data.email, subject: data.subject ?? null, message: data.message,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listInquiries = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.from("inquiries")
      .select("id, name, email, subject, message, status, created_at")
      .order("created_at", { ascending: false }).limit(200);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const setInquiryStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => z.object({ id: z.string().uuid(), status: z.enum(["open", "resolved"]) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("inquiries").update({ status: data.status }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
