import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { ShairCard } from "@/components/shair-card";
import type { Shair } from "@/lib/queries";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/favorites")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
  },
  head: () => ({ meta: [{ title: "Favorites — Bait Baazi" }] }),
  component: Favs,
});

function Favs() {
  const [items, setItems] = useState<Shair[] | null>(null);
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("favorites")
        .select("shair:shair(id, text_urdu, poet_id, book_id, page_number, start_letter, end_letter, category, difficulty, popularity, is_attack, source, poet:poets(name_urdu, name_english), book:books(title_urdu))")
        .order("created_at", { ascending: false });
      setItems(((data ?? []).map(r => (r as unknown as { shair: Shair }).shair).filter(Boolean)) as Shair[]);
    })();
  }, []);
  if (items === null) return <div className="text-center py-16"><Loader2 className="h-6 w-6 animate-spin mx-auto text-gold" /></div>;
  return (
    <div className="space-y-6">
      <header className="text-center">
        <h1 className="urdu text-3xl text-gold">پسندیدہ اشعار</h1>
      </header>
      {items.length === 0 ? (
        <p className="text-center text-muted-foreground urdu">ابھی کوئی پسندیدہ نہیں — <Link to="/browse" className="text-gold underline">حروف دیکھیں</Link></p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {items.map(s => <ShairCard key={s.id} shair={s} />)}
        </div>
      )}
    </div>
  );
}
