import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { shairSearchQuery } from "@/lib/queries";
import { ShairCard } from "@/components/shair-card";
import { useState } from "react";
import { Search as SearchIcon } from "lucide-react";

export const Route = createFileRoute("/search")({
  head: () => ({
    meta: [
      { title: "تلاش — Search Urdu Poetry | Bait Baazi" },
      { name: "description", content: "Search thousands of Urdu shair by word, poet, or partial line." },
    ],
  }),
  component: SearchPage,
});

function SearchPage() {
  const [q, setQ] = useState("");
  const [applied, setApplied] = useState("");
  const { data = [], isFetching } = useQuery(shairSearchQuery(applied));

  return (
    <div className="space-y-6">
      <header className="text-center">
        <h1 className="urdu text-3xl text-gold mb-2">تلاش</h1>
        <p className="urdu text-muted-foreground">لفظ، شاعر، یا کوئی مصرع تلاش کریں</p>
      </header>

      <form onSubmit={e => { e.preventDefault(); setApplied(q); }} className="flex gap-2 max-w-2xl mx-auto">
        <input
          value={q} onChange={e => setQ(e.target.value)}
          placeholder="مثلاً: دل، محبت، غالب…"
          dir="rtl"
          className="urdu flex-1 rounded-lg bg-input border border-gold/20 px-4 py-3 text-xl text-parchment focus:border-gold focus:outline-none"
        />
        <button className="bg-gold-gradient rounded-lg px-5 py-3 font-ltr font-semibold inline-flex items-center gap-2">
          <SearchIcon className="h-4 w-4" /> Go
        </button>
      </form>

      {applied && (
        <p className="text-center font-ltr text-sm text-muted-foreground">
          {isFetching ? "Searching…" : `${data.length} result${data.length === 1 ? "" : "s"} for "${applied}"`}
        </p>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {data.map(s => <ShairCard key={s.id} shair={s} />)}
      </div>
    </div>
  );
}
