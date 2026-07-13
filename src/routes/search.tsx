import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { shairSearchQuery, type Shair } from "@/lib/queries";
import { aiSearch } from "@/lib/ai.functions";
import { ShairCard } from "@/components/shair-card";
import { useState } from "react";
import { Loader2, Mic, MicOff, Search as SearchIcon, Sparkles } from "lucide-react";
import { useVoiceInput } from "@/hooks/use-voice-input";

export const Route = createFileRoute("/search")({
  head: () => ({
    meta: [
      { title: "تلاش — Search Urdu Poetry | Bait Baazi" },
      { name: "description", content: "Search Urdu shair by word, poet, or line — voice search and AI-powered Roman-Urdu search included." },
    ],
  }),
  component: SearchPage,
});

function SearchPage() {
  const [q, setQ] = useState("");
  const [applied, setApplied] = useState("");
  const [aiMode, setAiMode] = useState(false);
  const [aiResults, setAiResults] = useState<Shair[] | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiKeywords, setAiKeywords] = useState<string[]>([]);
  const [aiError, setAiError] = useState<string | null>(null);

  const runAi = useServerFn(aiSearch);
  const { data: plainData = [], isFetching } = useQuery({ ...shairSearchQuery(applied), enabled: !!applied && !aiMode });

  const voice = useVoiceInput({
    lang: aiMode ? "en-US" : "ur-PK",
    onFinal: (text) => { setQ(text); go(text); },
  });

  const go = async (text?: string) => {
    const query = (text ?? q).trim();
    if (!query) return;
    setApplied(query);
    if (aiMode) {
      setAiLoading(true); setAiError(null); setAiResults(null); setAiKeywords([]);
      try {
        const res = await runAi({ data: { query } });
        setAiKeywords(res.keywords);
        setAiResults(res.results as Shair[]);
      } catch (e) {
        setAiError(e instanceof Error ? e.message : "AI search failed");
      } finally {
        setAiLoading(false);
      }
    }
  };

  const results = aiMode ? (aiResults ?? []) : plainData;
  const busy = aiMode ? aiLoading : isFetching;

  return (
    <div className="space-y-5">
      <header className="text-center">
        <h1 className="urdu text-2xl sm:text-3xl text-gold mb-2">تلاش</h1>
        <p className="urdu text-sm sm:text-base text-muted-foreground">لفظ، شاعر، یا مصرع تلاش کریں</p>
      </header>

      {/* Mode toggle */}
      <div className="flex justify-center gap-2 text-xs font-ltr">
        <button onClick={() => setAiMode(false)} className={`px-3 py-1.5 rounded-full border ${!aiMode ? "bg-gold-gradient text-primary-foreground border-transparent" : "border-gold/30 text-gold"}`}>
          Urdu text
        </button>
        <button onClick={() => setAiMode(true)} className={`px-3 py-1.5 rounded-full border inline-flex items-center gap-1 ${aiMode ? "bg-gold-gradient text-primary-foreground border-transparent" : "border-gold/30 text-gold"}`}>
          <Sparkles className="h-3 w-3" /> AI · Roman Urdu
        </button>
      </div>

      <form onSubmit={e => { e.preventDefault(); go(); }} className="max-w-2xl mx-auto">
        <div className="flex gap-2 items-stretch">
          <input
            value={q} onChange={e => setQ(e.target.value)}
            placeholder={aiMode ? "e.g. dil, mohabbat, ghalib…" : "مثلاً: دل، محبت…"}
            dir={aiMode ? "ltr" : "rtl"}
            className={`${aiMode ? "font-ltr" : "urdu"} flex-1 min-w-0 rounded-lg bg-input border border-gold/20 px-3 sm:px-4 py-3 text-base sm:text-xl text-parchment focus:border-gold focus:outline-none`}
          />
          {voice.supported && (
            <button
              type="button"
              onClick={voice.listening ? voice.stop : voice.start}
              aria-label="Voice search"
              className={`shrink-0 rounded-lg px-3 py-3 border ${voice.listening ? "bg-destructive/20 border-destructive text-destructive animate-pulse" : "border-gold/40 text-gold"}`}
            >
              {voice.listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </button>
          )}
          <button className="shrink-0 bg-gold-gradient rounded-lg px-3 sm:px-5 py-3 font-ltr font-semibold inline-flex items-center gap-2">
            <SearchIcon className="h-4 w-4" /> <span className="hidden sm:inline">Go</span>
          </button>
        </div>
        {voice.listening && (
          <p className="text-center mt-2 text-xs text-muted-foreground font-ltr">Listening… {voice.transcript}</p>
        )}
        {voice.error && <p className="text-center mt-2 text-xs text-destructive font-ltr">{voice.error}</p>}
      </form>

      {aiKeywords.length > 0 && (
        <div className="max-w-2xl mx-auto flex flex-wrap gap-1.5 justify-center">
          <span className="font-ltr text-xs text-muted-foreground">AI keywords:</span>
          {aiKeywords.map(k => (
            <span key={k} className="urdu text-sm px-2 py-0.5 rounded-full border border-gold/30 text-gold">{k}</span>
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
      {aiError && <p className="text-center text-sm text-destructive font-ltr">{aiError}</p>}

      <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
        {results.map(s => <ShairCard key={s.id} shair={s} />)}
      </div>
    </div>
  );
}
