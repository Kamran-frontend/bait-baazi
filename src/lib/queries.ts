import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Shair = {
  id: string;
  serial: number | null;
  text_urdu: string;
  poet_id: string | null;
  book_id: string | null;
  page_number: number | null;
  start_letter: string;
  end_letter: string;
  category: string | null;
  difficulty: number | null;
  popularity: number | null;
  is_attack: boolean | null;
  source: string | null;
  poet?: { name_urdu: string; name_english: string | null } | null;
  book?: { title_urdu: string } | null;
};

const shairSelect = `
  id, serial, text_urdu, poet_id, book_id, page_number, start_letter, end_letter,
  category, difficulty, popularity, is_attack, source,
  poet:poets(name_urdu, name_english),
  book:books(title_urdu)
`;

export function shairByStartLetterQuery(letter: string) {
  return queryOptions({
    queryKey: ["shair", "start", letter],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shair").select(shairSelect)
        .eq("start_letter", letter)
        .order("popularity", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as unknown as Shair[];
    },
  });
}

export function shairByEndLetterQuery(letter: string) {
  return queryOptions({
    queryKey: ["shair", "end", letter],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shair").select(shairSelect)
        .eq("end_letter", letter)
        .order("popularity", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as unknown as Shair[];
    },
  });
}

export function shairSearchQuery(q: string) {
  return queryOptions({
    queryKey: ["shair", "search", q],
    queryFn: async () => {
      if (!q.trim()) return [] as Shair[];
      const { data, error } = await supabase
        .from("shair").select(shairSelect)
        .ilike("text_urdu", `%${q}%`)
        .order("popularity", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as unknown as Shair[];
    },
  });
}

export function shairStatsQuery() {
  return queryOptions({
    queryKey: ["shair", "stats"],
    queryFn: async () => {
      const [total, poetsC, booksC, byLetter] = await Promise.all([
        supabase.from("shair").select("id", { count: "exact", head: true }),
        supabase.from("poets").select("id", { count: "exact", head: true }),
        supabase.from("books").select("id", { count: "exact", head: true }),
        supabase.from("shair").select("start_letter, end_letter").limit(50000),
      ]);
      const countsByLetter: Record<string, number> = {};
      const countsByEndLetter: Record<string, number> = {};
      for (const r of (byLetter.data ?? []) as { start_letter: string; end_letter: string }[]) {
        if (r.start_letter) countsByLetter[r.start_letter] = (countsByLetter[r.start_letter] ?? 0) + 1;
        if (r.end_letter) countsByEndLetter[r.end_letter] = (countsByEndLetter[r.end_letter] ?? 0) + 1;
      }
      return {
        totalShair: total.count ?? 0,
        totalPoets: poetsC.count ?? 0,
        totalBooks: booksC.count ?? 0,
        countsByLetter,
        countsByEndLetter,
      };
    },
  });
}

// ---- Detailed filtering / sorting ----------------------------------------

export type ShairSort = "serial_asc" | "serial_desc" | "popular" | "newest" | "shortest" | "longest";

export type ShairFilters = {
  start?: string;
  end?: string;
  poetId?: string;
  bookId?: string;
  attack?: "any" | "only" | "none";
  q?: string;
  sort?: ShairSort;
};

// Keeps the select string out of supabase-js type-level parsing.
const sel = (s: string): string => s;

export function shairFilteredQuery(f: ShairFilters) {
  return queryOptions({
    queryKey: ["shair", "filtered", f],
    queryFn: async () => {
      let q = supabase.from("shair").select(sel(shairSelect));
      if (f.start) q = q.eq("start_letter", f.start);
      if (f.end) q = q.eq("end_letter", f.end);
      if (f.poetId) q = q.eq("poet_id", f.poetId);
      if (f.bookId) q = q.eq("book_id", f.bookId);
      if (f.attack === "only") q = q.eq("is_attack", true);
      if (f.attack === "none") q = q.eq("is_attack", false);
      if (f.q?.trim()) q = q.ilike("text_urdu", `%${f.q.trim()}%`);

      switch (f.sort ?? "serial_asc") {
        case "serial_desc": q = q.order("serial", { ascending: false }); break;
        case "popular": q = q.order("popularity", { ascending: false }); break;
        case "newest": q = q.order("created_at", { ascending: false }); break;
        default: q = q.order("serial", { ascending: true });
      }

      const { data, error } = await q.limit(1000).returns<Shair[]>();
      if (error) throw error;
      let rows = data ?? [];
      const s = f.sort ?? "serial_asc";
      if (s === "shortest" || s === "longest") {
        rows = [...rows].sort((a, b) =>
          s === "shortest"
            ? a.text_urdu.length - b.text_urdu.length
            : b.text_urdu.length - a.text_urdu.length);
      }
      return rows;
    },
  });
}

export function shairByIdQuery(id: string) {
  return queryOptions({
    queryKey: ["shair", "one", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shair").select(sel(shairSelect)).eq("id", id).maybeSingle<Shair>();
      if (error) throw error;
      return data ?? null;
    },
  });
}

export function poetsQuery() {
  return queryOptions({
    queryKey: ["poets", "all"],
    queryFn: async () => {
      const { data, error } = await supabase.from("poets").select("id, name_urdu, name_english").order("name_urdu");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function booksQuery() {
  return queryOptions({
    queryKey: ["books", "all"],
    queryFn: async () => {
      const { data, error } = await supabase.from("books").select("id, title_urdu").order("title_urdu");
      if (error) throw error;
      return data ?? [];
    },
  });
}
