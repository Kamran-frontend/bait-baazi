import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { getRandomShair } from "@/lib/ai.functions";
import { getEndLetter, getStartLetter, isUrduLetter } from "@/lib/urdu";
import { Eye, Loader2, RotateCcw, SkipForward, Sparkles, Target } from "lucide-react";

export const Route = createFileRoute("/practice")({
  head: () => ({
    meta: [
      { title: "مشق — Practice Bait Baazi | Solo Practice Mode" },
      { name: "description", content: "Practice Bait Baazi solo — get a random shair, find the end letter, and try to recall one that starts with it." },
    ],
  }),
  component: Practice,
});

type Card = {
  id: string;
  text_urdu: string;
  start_letter: string;
  end_letter: string;
  poet?: { name_urdu: string } | null;
  book?: { title_urdu: string } | null;
};

function Practice() {
  const draw = useServerFn(getRandomShair);
  const [current, setCurrent] = useState<Card | null>(null);
  const [loading, setLoading] = useState(false);
  const [seenIds, setSeenIds] = useState<string[]>([]);
  const [reveal, setReveal] = useState(false);
  const [next, setNext] = useState<Card | null>(null);
  const [nextLoading, setNextLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [required, setRequired] = useState<string>("");
  const [streak, setStreak] = useState(0);

  const pull = async (startLetter?: string) => {
    setLoading(true); setErr(null); setReveal(false); setNext(null);
    try {
      const res = await draw({ data: { startLetter, excludeIds: seenIds } });
      if (!res.ok) { setErr(startLetter ? `کوئی شعر '${startLetter}' سے موجود نہیں` : "ابھی کوئی شعر موجود نہیں — ایڈمن سے کچھ اشعار درج کروائیں"); setCurrent(null); return; }
      setCurrent(res.shair as Card);
      setSeenIds(s => [...s, res.shair.id]);
      setRequired(res.shair.end_letter);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed");
    } finally { setLoading(false); }
  };

  useEffect(() => { pull(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const showAnswer = async () => {
    if (!required) return;
    setNextLoading(true);
    try {
      const res = await draw({ data: { startLetter: required, excludeIds: seenIds } });
      if (res.ok) { setNext(res.shair as Card); setReveal(true); }
      else { setErr(`کوئی شعر '${required}' سے موجود نہیں`); setReveal(true); }
    } finally { setNextLoading(false); }
  };

  const gotIt = () => { setStreak(s => s + 1); if (next) { setCurrent(next); setSeenIds(s => [...s, next.id]); setRequired(next.end_letter); setNext(null); setReveal(false); } else pull(required); };
  const skip = () => { setStreak(0); pull(required); };
  const reset = () => { setSeenIds([]); setStreak(0); pull(); };

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <header className="text-center">
        <h1 className="urdu text-2xl sm:text-3xl text-gold">مشق</h1>
        <p className="urdu text-sm text-muted-foreground">تن تنہا مشق کریں — شعر پڑھیں، آخری حرف دیکھیں، اور اس سے شروع ہونے والا شعر یاد کرنے کی کوشش کریں</p>
      </header>

      <div className="grid grid-cols-2 gap-2 text-xs font-ltr">
        <div className="card-royal rounded-xl p-3 text-center">
          <div className="text-muted-foreground uppercase">Streak</div>
          <div className="text-2xl text-gold font-bold">{streak}</div>
        </div>
        <div className="card-royal rounded-xl p-3 text-center">
          <div className="text-muted-foreground uppercase">Seen</div>
          <div className="text-2xl text-gold font-bold">{seenIds.length}</div>
        </div>
      </div>

      {loading && <div className="text-center py-10"><Loader2 className="h-6 w-6 animate-spin text-gold mx-auto" /></div>}

      {!loading && current && (
        <div className="card-royal rounded-2xl p-5 sm:p-6 space-y-4">
          <p className="urdu text-xl sm:text-2xl leading-loose text-parchment whitespace-pre-line break-words">{current.text_urdu}</p>
          {current.poet?.name_urdu && <p className="urdu text-sm text-gold-muted">— {current.poet.name_urdu}</p>}
          <div className="border-t border-gold/10 pt-4 text-center">
            <p className="urdu text-xs text-muted-foreground mb-1">آخری حرف</p>
            <p className="urdu text-5xl text-gold">{required || "—"}</p>
            <p className="urdu text-xs text-muted-foreground mt-2">اب اس حرف سے شروع ہونے والا شعر یاد کریں…</p>
          </div>
        </div>
      )}

      {reveal && next && (
        <div className="card-royal rounded-2xl p-5 border-gold/40 space-y-2">
          <p className="urdu text-xs text-gold-muted">مکمل جواب (لائبریری سے):</p>
          <p className="urdu text-lg sm:text-xl text-parchment whitespace-pre-line break-words">{next.text_urdu}</p>
          {next.poet?.name_urdu && <p className="urdu text-xs text-gold-muted">— {next.poet.name_urdu}</p>}
        </div>
      )}

      {err && <p className="text-center text-sm text-destructive urdu">{err}</p>}

      <div className="flex flex-wrap gap-2 justify-center">
        {!reveal ? (
          <button onClick={showAnswer} disabled={!current || nextLoading} className="bg-gold-gradient rounded-lg px-4 py-2 font-ltr font-semibold inline-flex items-center gap-2 disabled:opacity-50">
            {nextLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />} Show answer
          </button>
        ) : (
          <button onClick={gotIt} className="bg-gold-gradient rounded-lg px-4 py-2 font-ltr font-semibold inline-flex items-center gap-2">
            <Target className="h-4 w-4" /> Got it — next
          </button>
        )}
        <button onClick={skip} className="border border-gold/40 text-gold rounded-lg px-4 py-2 font-ltr text-sm inline-flex items-center gap-1">
          <SkipForward className="h-4 w-4" /> Skip
        </button>
        <button onClick={reset} className="border border-muted-foreground/40 text-muted-foreground rounded-lg px-4 py-2 font-ltr text-sm inline-flex items-center gap-1">
          <RotateCcw className="h-4 w-4" /> Reset
        </button>
      </div>

      <p className="text-center text-xs text-muted-foreground font-ltr inline-flex items-center gap-1 justify-center w-full">
        <Sparkles className="h-3 w-3" /> Tip: اپنے حافظے سے پہلے یاد کریں، پھر جواب دیکھیں
      </p>

      {/* silence lint */}
      <span className="hidden">{isUrduLetter(getStartLetter(getEndLetter("ا"))) ? "" : ""}</span>
    </div>
  );
}
