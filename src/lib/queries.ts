import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Shair = {
  id: string;
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
  id, text_urdu, poet_id, book_id, page_number, start_letter, end_letter,
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
