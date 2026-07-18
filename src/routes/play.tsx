import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getAiReply, verifyShair } from "@/lib/ai.functions";
import { getStartLetter, getEndLetter, isAttackLetter, isUrduLetter, URDU_LETTERS } from "@/lib/urdu";
import { Bot, Flag, Loader2, RotateCcw, Sparkles, User, Flame, CheckCircle2 } from "lucide-react";

type Turn = {
  by: "player" | "ai";
  text: string;
  startLetter: string;
  endLetter: string;
  verified?: boolean;
  poet?: string | null;
};

export const Route = createFileRoute("/play")({
  head: () => ({
    meta: [
      { title: "بیت بازی — Play against AI | Urdu Shair Game" },
      { name: "description", content: "Play Bait Baazi against an AI opponent that draws from a library of Ahmadiyya Muslim Jamat Urdu poetry." },
    ],
  }),
  component: Play,
});

function Play() {
  const [difficulty, setDifficulty] = useState<"easy"|"medium"|"hard"|"expert">("medium");
  const [required, setRequired] = useState<string>(""); // required start letter for next player move; empty on first
  const [history, setHistory] = useState<Turn[]>([]);
  const [usedIds, setUsedIds] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [winner, setWinner] = useState<"player"|"ai"|null>(null);
  const [score, setScore] = useState({ player: 0, ai: 0 });

  const askAi = useServerFn(getAiReply);
  const askVerify = useServerFn(verifyShair);

  const reset = () => {
    setRequired(""); setHistory([]); setUsedIds([]); setInput(""); setStatus(""); setWinner(null);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy || winner) return;
    const text = input.trim();
    if (text.length < 3) { setStatus("مکمل شعر لکھیں"); return; }

    const startL = getStartLetter(text);
    const endL = getEndLetter(text);
    if (!isUrduLetter(startL) || !isUrduLetter(endL)) {
      setStatus("اردو حروف میں شعر لکھیں"); return;
    }
    if (required && startL !== required) {
      setStatus(`شعر '${required}' سے شروع ہونا چاہیئے`); return;
    }
    setBusy(true); setStatus("");
    try {
      const v = await askVerify({ data: { text } });
      const playerTurn: Turn = { by: "player", text, startLetter: startL, endLetter: endL, verified: v.verified, poet: v.match?.poet?.name_urdu ?? null };
      const newHistory = [...history, playerTurn];
      setHistory(newHistory);
      setInput("");

      // AI's turn: needs a shair starting with endL
      const res = await askAi({ data: { startLetter: endL, usedIds, difficulty } });
      if (!res.ok) {
        setWinner("player");
        setScore(s => ({ ...s, player: s.player + 1 }));
        setStatus(`AI کے پاس '${endL}' سے کوئی شعر نہیں — آپ جیت گئے!`);
        return;
      }
      const s = res.shair;
      const aiTurn: Turn = {
        by: "ai", text: s.text_urdu, startLetter: s.start_letter,
        endLetter: s.end_letter, verified: true, poet: s.poet?.name_urdu ?? null,
      };
      setHistory([...newHistory, aiTurn]);
      setUsedIds(u => [...u, s.id]);
      setRequired(s.end_letter);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  const concede = () => {
    if (winner) return;
    setWinner("ai");
    setScore(s => ({ ...s, ai: s.ai + 1 }));
    setStatus("آپ نے ہار مان لی");
  };

  return (
    <div className="space-y-5 max-w-3xl mx-auto">
      <header className="text-center">
        <h1 className="urdu text-3xl text-gold">بیت بازی</h1>
        <p className="urdu text-sm text-muted-foreground">AI کے ساتھ کھیلیں — آخری حرف اگلے شعر کا پہلا حرف بنے گا</p>
      </header>

      {/* Controls */}
      <div className="card-royal rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="font-ltr text-xs text-muted-foreground uppercase">Difficulty:</span>
          {(["easy","medium","hard","expert"] as const).map(d => (
            <button key={d} onClick={() => setDifficulty(d)} disabled={history.length > 0}
              className={`font-ltr text-xs px-2.5 py-1 rounded-md capitalize disabled:opacity-50 ${difficulty === d ? "bg-gold-gradient text-primary-foreground" : "border border-gold/30 text-gold"}`}>
              {d}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3 text-sm font-ltr">
          <span className="text-gold">You: <b>{score.player}</b></span>
          <span className="text-parchment/60">AI: <b>{score.ai}</b></span>
          <button onClick={reset} className="ms-2 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-gold"><RotateCcw className="h-3 w-3" /> Reset</button>
        </div>
      </div>

      {/* Required letter banner */}
      <div className="card-royal rounded-xl p-4 text-center">
        <p className="urdu text-sm text-muted-foreground">اگلا حرف</p>
        <div className="flex items-center justify-center gap-2 mt-1">
          <span className="urdu text-5xl text-gold">{required || "کوئی بھی"}</span>
          {required && isAttackLetter(required) && (
            <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-destructive/20 text-destructive font-ltr">
              <Flame className="h-3 w-3" /> hard
            </span>
          )}
        </div>
      </div>

      {/* Conversation */}
      <div className="space-y-3">
        {history.length === 0 && (
          <div className="text-center py-10 text-muted-foreground urdu">پہلا شعر آپ سناتے ہیں — کوئی بھی حرف چل جائے گا</div>
        )}
        {history.map((t, i) => (
          <div key={i} className={`flex ${t.by === "player" ? "justify-start" : "justify-end"}`}>
            <div className={`card-royal rounded-2xl p-4 max-w-[85%] ${t.by === "player" ? "border-gold/30" : "border-accent/50"}`}>
              <div className="flex items-center gap-2 mb-2 text-xs font-ltr text-muted-foreground">
                {t.by === "player" ? <User className="h-3 w-3" /> : <Bot className="h-3 w-3 text-gold" />}
                <span>{t.by === "player" ? "You" : "AI"}</span>
                {t.verified && <span className="inline-flex items-center gap-0.5 text-gold-muted"><CheckCircle2 className="h-3 w-3" /> library</span>}
                <span>·</span>
                <span className="urdu">{t.startLetter}→{t.endLetter}</span>
              </div>
              <p className="urdu urdu-lg text-parchment whitespace-pre-line">{t.text}</p>
              {t.poet && <p className="urdu text-xs text-gold-muted mt-2">— {t.poet}</p>}
            </div>
          </div>
        ))}
        {busy && (
          <div className="flex justify-end">
            <div className="card-royal rounded-2xl p-4 inline-flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-gold" />
              <span className="urdu text-sm text-muted-foreground">AI سوچ رہا ہے…</span>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      {!winner ? (
        <form onSubmit={submit} className="card-royal rounded-2xl p-3 flex gap-2 items-end sticky bottom-3">
          <textarea
            dir="rtl" rows={2} value={input} onChange={e => setInput(e.target.value)}
            placeholder={required ? `'${required}' سے شعر لکھیں…` : "اپنا پہلا شعر لکھیں…"}
            className="urdu flex-1 rounded-lg bg-input border border-gold/20 px-3 py-2 text-lg text-parchment focus:border-gold focus:outline-none resize-none"
          />
          <div className="flex flex-col gap-2">
            <button disabled={busy} className="bg-gold-gradient rounded-lg px-4 py-2 font-ltr font-semibold inline-flex items-center gap-2 disabled:opacity-50">
              <Sparkles className="h-4 w-4" /> Send
            </button>
            <button type="button" onClick={concede} className="border border-destructive/40 text-destructive rounded-lg px-4 py-1 font-ltr text-xs inline-flex items-center gap-1">
              <Flag className="h-3 w-3" /> Concede
            </button>
          </div>
        </form>
      ) : (
        <div className={`card-royal rounded-2xl p-6 text-center ${winner === "player" ? "border-gold" : "border-destructive/50"}`}>
          <h3 className="urdu text-2xl text-gold mb-2">{winner === "player" ? "مبارک ہو! آپ جیت گئے" : "AI جیت گیا"}</h3>
          <button onClick={reset} className="mt-2 bg-gold-gradient rounded-lg px-5 py-2 font-ltr font-semibold inline-flex items-center gap-2">
            <RotateCcw className="h-4 w-4" /> Play again
          </button>
        </div>
      )}

      {status && <p className="text-center text-sm urdu text-destructive">{status}</p>}

      {/* Suggested letters if stuck */}
      {required && (
        <SuggestionStrip required={required} />
      )}
    </div>
  );
}

function SuggestionStrip({ required }: { required: string }) {
  return (
    <div className="text-center text-xs text-muted-foreground urdu">
      اشارہ: <a href={`/letter/start/${required}`} className="text-gold underline">'{required}' سے شروع ہونے والے اشعار دیکھیں</a>
    </div>
  );
}

// Silence lint: URDU_LETTERS re-exported for tree-shake friendliness
void URDU_LETTERS;
