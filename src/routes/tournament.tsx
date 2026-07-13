import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { getAiReply, verifyShair } from "@/lib/ai.functions";
import { getStartLetter, getEndLetter, isUrduLetter, isAttackLetter } from "@/lib/urdu";
import { useVoiceInput } from "@/hooks/use-voice-input";
import { Bot, Check, Crown, Flag, Flame, Loader2, Mic, MicOff, RotateCcw, Sparkles, Trophy, User, Volume2 } from "lucide-react";

export const Route = createFileRoute("/tournament")({
  head: () => ({
    meta: [
      { title: "ٹورنامنٹ — Tournament Mode | Voice Bait Baazi" },
      { name: "description", content: "Compete in a best-of-N Bait Baazi tournament against AI, with voice input and a running list of already-played shair." },
    ],
  }),
  component: Tournament,
});

type Turn = { by: "player" | "ai"; text: string; start: string; end: string; verified?: boolean; poet?: string | null; id?: string };

function Tournament() {
  const askAi = useServerFn(getAiReply);
  const askVerify = useServerFn(verifyShair);

  const [target, setTarget] = useState(5);
  const [difficulty, setDifficulty] = useState<"easy"|"medium"|"hard"|"expert">("medium");
  const [voiceMode, setVoiceMode] = useState(true);
  const [ttsOn, setTtsOn] = useState(true);

  const [required, setRequired] = useState("");
  const [history, setHistory] = useState<Turn[]>([]);
  const [usedIds, setUsedIds] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [score, setScore] = useState({ player: 0, ai: 0 });
  const [champion, setChampion] = useState<"player"|"ai"|null>(null);
  const [started, setStarted] = useState(false);

  const speak = (text: string) => {
    if (!ttsOn || typeof window === "undefined" || !window.speechSynthesis) return;
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = "ur-PK";
      u.rate = 0.85;
      window.speechSynthesis.speak(u);
    } catch { /* noop */ }
  };

  const voice = useVoiceInput({
    lang: "ur-PK",
    onFinal: (text) => { setInput(text); submitText(text); },
  });

  const startMatch = () => {
    setStarted(true);
    setScore({ player: 0, ai: 0 });
    setHistory([]); setUsedIds([]); setRequired(""); setChampion(null); setStatus("");
  };

  const resetRound = () => { setHistory([]); setUsedIds([]); setRequired(""); setStatus(""); };

  const finishRound = (winner: "player"|"ai", reason: string) => {
    const s = { ...score, [winner]: score[winner] + 1 };
    setScore(s);
    setStatus(reason);
    if (s[winner] >= target) { setChampion(winner); }
    else { setTimeout(() => resetRound(), 1500); }
  };

  const submitText = async (raw?: string) => {
    if (busy || champion) return;
    const text = (raw ?? input).trim();
    if (text.length < 3) { setStatus("مکمل شعر لکھیں"); return; }
    const s = getStartLetter(text); const e = getEndLetter(text);
    if (!isUrduLetter(s) || !isUrduLetter(e)) { setStatus("اردو حروف میں شعر لکھیں"); return; }
    if (required && s !== required) { setStatus(`شعر '${required}' سے شروع ہونا چاہیئے`); return; }
    setBusy(true); setStatus("");
    try {
      const v = await askVerify({ data: { text } });
      const playerTurn: Turn = { by: "player", text, start: s, end: e, verified: v.verified, poet: v.match?.poet?.name_urdu ?? null, id: v.match?.id };
      const newHistory = [...history, playerTurn];
      setHistory(newHistory);
      setInput("");
      if (v.match?.id) setUsedIds(u => [...u, v.match!.id]);

      const res = await askAi({ data: { startLetter: e, usedIds: [...usedIds, ...(v.match?.id ? [v.match.id] : [])], difficulty } });
      if (!res.ok) { finishRound("player", `AI کے پاس '${e}' سے کوئی شعر نہیں — راؤنڈ آپ کا!`); return; }
      const ai = res.shair;
      const aiTurn: Turn = { by: "ai", text: ai.text_urdu, start: ai.start_letter, end: ai.end_letter, verified: true, poet: ai.poet?.name_urdu ?? null, id: ai.id };
      setHistory([...newHistory, aiTurn]);
      setUsedIds(u => [...u, ai.id]);
      setRequired(ai.end_letter);
      speak(ai.text_urdu);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Error");
    } finally { setBusy(false); }
  };

  const concede = () => finishRound("ai", "آپ نے راؤنڈ چھوڑ دیا");

  if (!started || champion) {
    return (
      <div className="max-w-xl mx-auto space-y-5">
        <header className="text-center">
          <h1 className="urdu text-2xl sm:text-3xl text-gold flex items-center justify-center gap-2"><Trophy className="h-6 w-6" /> ٹورنامنٹ</h1>
          <p className="urdu text-sm text-muted-foreground">آواز کے ساتھ AI سے مقابلہ کریں</p>
        </header>

        {champion && (
          <div className={`card-royal rounded-2xl p-6 text-center ${champion === "player" ? "border-gold" : "border-destructive/50"}`}>
            <Crown className={`h-10 w-10 mx-auto mb-2 ${champion === "player" ? "text-gold" : "text-destructive"}`} />
            <h2 className="urdu text-2xl text-gold">{champion === "player" ? "چیمپیئن آپ ہیں!" : "AI چیمپیئن بن گیا"}</h2>
            <p className="font-ltr text-sm text-muted-foreground mt-1">Final {score.player} — {score.ai}</p>
          </div>
        )}

        <div className="card-royal rounded-2xl p-4 space-y-4">
          <div>
            <div className="font-ltr text-xs text-muted-foreground uppercase mb-2">Best of</div>
            <div className="flex gap-2">
              {[3, 5, 7].map(n => (
                <button key={n} onClick={() => setTarget(n)} className={`flex-1 font-ltr text-sm py-2 rounded-lg ${target === n ? "bg-gold-gradient text-primary-foreground" : "border border-gold/30 text-gold"}`}>{n}</button>
              ))}
            </div>
          </div>
          <div>
            <div className="font-ltr text-xs text-muted-foreground uppercase mb-2">Difficulty</div>
            <div className="grid grid-cols-4 gap-2">
              {(["easy","medium","hard","expert"] as const).map(d => (
                <button key={d} onClick={() => setDifficulty(d)} className={`font-ltr text-xs py-2 rounded-lg capitalize ${difficulty === d ? "bg-gold-gradient text-primary-foreground" : "border border-gold/30 text-gold"}`}>{d}</button>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setVoiceMode(v => !v)} className={`flex-1 min-w-[140px] font-ltr text-xs py-2 rounded-lg inline-flex items-center justify-center gap-2 ${voiceMode ? "bg-gold/20 text-gold border border-gold/40" : "border border-muted-foreground/30 text-muted-foreground"}`}>
              <Mic className="h-3 w-3" /> Voice input {voiceMode ? "ON" : "OFF"}
            </button>
            <button onClick={() => setTtsOn(t => !t)} className={`flex-1 min-w-[140px] font-ltr text-xs py-2 rounded-lg inline-flex items-center justify-center gap-2 ${ttsOn ? "bg-gold/20 text-gold border border-gold/40" : "border border-muted-foreground/30 text-muted-foreground"}`}>
              <Volume2 className="h-3 w-3" /> AI speech {ttsOn ? "ON" : "OFF"}
            </button>
          </div>
        </div>

        <button onClick={startMatch} className="w-full bg-gold-gradient rounded-lg py-3 font-ltr font-semibold inline-flex items-center justify-center gap-2">
          <Sparkles className="h-4 w-4" /> {champion ? "Play again" : "Start tournament"}
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      {/* Scoreboard */}
      <div className="card-royal rounded-xl p-3 grid grid-cols-3 items-center gap-2 sticky top-14 z-10">
        <div className="text-center">
          <div className="font-ltr text-[10px] text-muted-foreground uppercase">You</div>
          <div className="text-3xl text-gold font-ltr font-bold">{score.player}</div>
        </div>
        <div className="text-center">
          <div className="font-ltr text-[10px] text-muted-foreground uppercase">Best of {target}</div>
          <div className="urdu text-lg text-gold">{required || "—"}</div>
          {required && isAttackLetter(required) && <span className="inline-flex items-center gap-1 text-[10px] text-destructive font-ltr"><Flame className="h-3 w-3" /> attack</span>}
        </div>
        <div className="text-center">
          <div className="font-ltr text-[10px] text-muted-foreground uppercase">AI</div>
          <div className="text-3xl text-destructive font-ltr font-bold">{score.ai}</div>
        </div>
      </div>

      {/* History */}
      <div className="space-y-3">
        {history.length === 0 && <p className="text-center urdu text-muted-foreground py-6">پہلا شعر آپ سنائیں</p>}
        {history.map((t, i) => (
          <div key={i} className={`flex ${t.by === "player" ? "justify-start" : "justify-end"}`}>
            <div className={`card-royal rounded-2xl p-3 sm:p-4 max-w-[90%] ${t.by === "player" ? "border-gold/30" : "border-destructive/30"}`}>
              <div className="flex items-center gap-2 mb-2 text-[10px] font-ltr text-muted-foreground">
                {t.by === "player" ? <User className="h-3 w-3" /> : <Bot className="h-3 w-3 text-destructive" />}
                <span>{t.by === "player" ? "You" : "AI"}</span>
                {t.verified && <span className="text-gold-muted inline-flex items-center gap-0.5"><Check className="h-3 w-3" /> library</span>}
                <span>·</span><span className="urdu">{t.start}→{t.end}</span>
              </div>
              <p className="urdu text-lg sm:text-xl text-parchment whitespace-pre-line break-words">{t.text}</p>
              {t.poet && <p className="urdu text-xs text-gold-muted mt-1">— {t.poet}</p>}
            </div>
          </div>
        ))}
        {busy && <div className="flex justify-end"><div className="card-royal rounded-2xl p-3 inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin text-gold" /><span className="urdu text-xs text-muted-foreground">سوچ رہا ہے…</span></div></div>}
      </div>

      {/* Played shair list */}
      {usedIds.length > 0 && (
        <details className="card-royal rounded-xl p-3">
          <summary className="cursor-pointer font-ltr text-xs text-gold-muted">Played shair ({usedIds.length})</summary>
          <ul className="mt-2 space-y-1 max-h-48 overflow-auto">
            {history.filter(h => h.id).map((h, i) => (
              <li key={i} className="urdu text-sm text-muted-foreground truncate flex items-center gap-1">
                <Check className="h-3 w-3 text-gold shrink-0" /> {h.text.split("\n")[0]}
              </li>
            ))}
          </ul>
        </details>
      )}

      {/* Input */}
      <form onSubmit={e => { e.preventDefault(); submitText(); }} className="card-royal rounded-2xl p-3 space-y-2 sticky bottom-2">
        <textarea
          dir="rtl" rows={2} value={input} onChange={e => setInput(e.target.value)}
          placeholder={required ? `'${required}' سے شعر لکھیں یا بولیں…` : "اپنا پہلا شعر…"}
          className="urdu w-full rounded-lg bg-input border border-gold/20 px-3 py-2 text-lg text-parchment focus:border-gold focus:outline-none resize-none"
        />
        {voice.listening && <p className="text-xs text-muted-foreground urdu">سن رہا ہے… {voice.transcript}</p>}
        {voice.error && <p className="text-xs text-destructive font-ltr">{voice.error}</p>}
        <div className="flex gap-2 flex-wrap">
          {voiceMode && voice.supported && (
            <button type="button" onClick={voice.listening ? voice.stop : voice.start} disabled={busy}
              className={`flex-1 min-w-[120px] rounded-lg px-3 py-2 font-ltr text-sm inline-flex items-center justify-center gap-1 ${voice.listening ? "bg-destructive/20 border border-destructive text-destructive animate-pulse" : "border border-gold/40 text-gold"}`}>
              {voice.listening ? <><MicOff className="h-4 w-4" /> Stop</> : <><Mic className="h-4 w-4" /> Speak</>}
            </button>
          )}
          <button disabled={busy} className="flex-1 min-w-[120px] bg-gold-gradient rounded-lg px-4 py-2 font-ltr font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-50">
            <Sparkles className="h-4 w-4" /> Send
          </button>
          <button type="button" onClick={concede} className="rounded-lg px-3 py-2 border border-destructive/40 text-destructive font-ltr text-xs inline-flex items-center gap-1">
            <Flag className="h-3 w-3" /> Give up round
          </button>
          <button type="button" onClick={() => { setChampion(null); setStarted(false); }} className="rounded-lg px-3 py-2 border border-muted-foreground/30 text-muted-foreground font-ltr text-xs inline-flex items-center gap-1">
            <RotateCcw className="h-3 w-3" /> Exit
          </button>
        </div>
        {status && <p className="text-center urdu text-sm text-destructive">{status}</p>}
      </form>
    </div>
  );
}
