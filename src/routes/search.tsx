import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { type Shair } from "@/lib/queries";
import { aiSearch } from "@/lib/ai.functions";
import { ShairCard } from "@/components/shair-card";
import { Pagination, usePaged } from "@/components/pagination";
import { useState } from "react";
import { Download, Loader2, Mic, MicOff, Search as SearchIcon } from "lucide-react";
import { useVoiceInput } from "@/hooks/use-voice-input";
import { ShairListSkeleton } from "@/components/loading";
import { downloadCsv, shairToCsv } from "@/lib/csv";

export const Route = createFileRoute("/search")({
  head: () => ({
    meta: [
      { title: "تلاش — Search Urdu Poetry | Bait Baazi" },
      { name: "description", content: "Search Urdu shair by word, poet or line — type in Urdu or Roman Urdu, voice search included." },
    ],
  }),
  component: SearchPage,
});

const shairSelect = `
  id, serial, text_urdu, poet_id, book_id, page_number, start_letter, end_letter,
  category, difficulty, popularity, is_attack, source,
  poet:poets(name_urdu, name_english),
  book:books(title_urdu)
`;

// Detects Arabic/Urdu script — anything else routes through AI transliteration too.
const hasUrduScript = (s: string) => /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/.test(s);

function SearchPage() {
  const [q, setQ] = useState("");
  const [applied, setApplied] = useState("");
  const [results, setResults] = useState<Shair[]>([]);
  const [busy, setBusy] = useState(false);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const runAi = useServerFn(aiSearch);

  const voice = useVoiceInput({
    // Web Speech: accept either Urdu or English utterances.
    lang: "ur-PK",
    onFinal: (text) => { setQ(text); go(text); },
  });

  const go = async (text?: string) => {
    const query = (text ?? q).trim();
    if (!query) return;
    setApplied(query); setBusy(true); setError(null); setKeywords([]); setPage(1);
    const merged = new Map<string, Shair>();
    try {
      // 1. Direct match — instant if user typed Urdu.
      const { data: direct } = await supabase.from("shair").select(shairSelect)
        .ilike("text_urdu", `%${query}%`).order("popularity", { ascending: false }).limit(60);
      for (const r of (direct ?? []) as unknown as Shair[]) merged.set(r.id, r);

      // 2. Always run AI expansion so Roman-Urdu / English / mixed queries also match.
      //    Skip only when the query is pure Urdu AND we already have plenty of hits.
      const shouldAi = !hasUrduScript(query) || merged.size < 5;
      if (shouldAi) {
        try {
          const res = await runAi({ data: { query } });
          setKeywords(res.keywords ?? []);
          for (const r of (res.results ?? []) as Shair[]) merged.set(r.id, r);
        } catch (e) {
          // AI failure doesn't kill the plain results.
          if (merged.size === 0) setError(e instanceof Error ? e.message : "AI search failed");
        }
      }
      setResults(Array.from(merged.values()));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <header className="text-center">
        <h1 className="urdu text-2xl sm:text-3xl mb-2">تلاش</h1>
        <p className="font-ltr text-xs sm:text-sm text-muted-foreground">Type in Urdu or Roman Urdu — search any word, line or poet</p>
      </header>

      <form onSubmit={e => { e.preventDefault(); go(); }} className="max-w-2xl mx-auto">
        <div className="flex gap-2 items-stretch">
          <input
            value={q} onChange={e => setQ(e.target.value)}
            placeholder="Search…"
            dir="auto"
            className="flex-1 min-w-0 rounded-lg bg-input border border-border px-3 sm:px-4 py-3 text-base sm:text-lg focus:border-foreground focus:outline-none"
          />
          {voice.supported && (
            <button
              type="button"
              onClick={voice.listening ? voice.stop : voice.start}
              aria-label="Voice search"
              className={`shrink-0 rounded-lg px-3 py-3 border ${voice.listening ? "bg-destructive/20 border-destructive text-destructive animate-pulse" : "border-border"}`}
            >
              {voice.listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </button>
          )}
          <button className="shrink-0 bg-foreground text-background rounded-lg px-3 sm:px-5 py-3 font-ltr font-semibold inline-flex items-center gap-2">
            <SearchIcon className="h-4 w-4" /> <span className="hidden sm:inline">Search</span>
          </button>
        </div>
        {voice.listening && (
          <p className="text-center mt-2 text-xs text-muted-foreground font-ltr">Listening… {voice.transcript}</p>
        )}
        {voice.error && <p className="text-center mt-2 text-xs text-destructive font-ltr">{voice.error}</p>}
      </form>

      {keywords.length > 0 && (
        <div className="max-w-2xl mx-auto flex flex-wrap gap-1.5 justify-center">
          <span className="font-ltr text-xs text-muted-foreground">Matched:</span>
          {keywords.map(k => (
            <button
              key={k}
              type="button"
              onClick={() => { setQ(k); go(k); }}
              className="urdu text-sm px-2 py-0.5 rounded-full border border-border hover:bg-accent transition-colors"
            >{k}</button>
          ))}
        </div>
      )}

      {applied && (
        <p className="text-center font-ltr text-sm text-muted-foreground">
          {busy ? (
            <span className="inline-flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Searching…</span>
          ) : (
            `${results.length} result${results.length === 1 ? "" : "s"} for "${applied}"`
          )}
        </p>
      )}
      {error && <p className="text-center text-sm text-destructive font-ltr">{error}</p>}

      {results.length > 0 && !busy && (
        <div className="flex justify-center">
          <button
            onClick={() => downloadCsv(`search-${applied || "results"}`, shairToCsv(results))}
            className="font-ltr text-xs inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border hover:bg-accent"
          >
            <Download className="h-3.5 w-3.5" /> Export CSV
          </button>
        </div>
      )}

      {busy ? <ShairListSkeleton /> : <SearchResults results={results} page={page} setPage={setPage} />}
    </div>
  );
}

function SearchResults({ results, page, setPage }: { results: Shair[]; page: number; setPage: (p: number) => void }) {
  const paged = usePaged(results, page);
  return (
    <>
      <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
        {paged.slice.map(s => <ShairCard key={s.id} shair={s} />)}
      </div>
      <Pagination page={paged.page} totalPages={paged.totalPages} onChange={setPage} />
    </>
  );
}
