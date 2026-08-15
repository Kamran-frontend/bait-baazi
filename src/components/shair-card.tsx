import type { Shair } from "@/lib/queries";
import { Link } from "@tanstack/react-router";
import { Bookmark, Check, Flag, Flame, Info, Shield } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function ShairCard({ shair, compact, done }: {
  shair: Shair;
  compact?: boolean;
  done?: boolean;
}) {
  const [userId, setUserId] = useState<string | null>(null);
  const [isFav, setIsFav] = useState(false);
  const [flagged, setFlagged] = useState(false);
  const [flagOpen, setFlagOpen] = useState(false);
  const [flagReason, setFlagReason] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    supabase.auth.getUser().then(async ({ data }) => {
      if (!alive) return;
      const uid = data.user?.id ?? null;
      setUserId(uid);
      if (!uid) return;
      const [{ data: fav }, { data: fl }] = await Promise.all([
        supabase.from("favorites").select("id").eq("user_id", uid).eq("shair_id", shair.id).maybeSingle(),
        supabase.from("shair_flags").select("id").eq("user_id", uid).eq("shair_id", shair.id).maybeSingle(),
      ]);
      if (!alive) return;
      setIsFav(!!fav); setFlagged(!!fl);
    });
    return () => { alive = false; };
  }, [shair.id]);

  const toggleFav = async () => {
    if (!userId) { window.location.href = "/auth"; return; }
    setBusy(true);
    if (isFav) {
      await supabase.from("favorites").delete().eq("user_id", userId).eq("shair_id", shair.id);
      setIsFav(false);
    } else {
      await supabase.from("favorites").insert({ user_id: userId, shair_id: shair.id });
      setIsFav(true);
    }
    setBusy(false);
  };

  const submitFlag = async () => {
    if (!userId) { window.location.href = "/auth"; return; }
    setBusy(true);
    await supabase.from("shair_flags").upsert({ user_id: userId, shair_id: shair.id, reason: flagReason.trim() || null, status: "open" }, { onConflict: "shair_id,user_id" });
    setFlagged(true); setFlagOpen(false); setFlagReason(""); setBusy(false);
  };

  return (
    <article className={`card-royal rounded-2xl p-3 sm:p-5 transition-transform hover:-translate-y-0.5 ${done ? "opacity-60" : ""}`}>
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 mb-3">
        <div className="flex min-w-0 items-center gap-1.5 sm:gap-2 flex-wrap">
          {shair.serial != null && (
            <span className="font-ltr text-[10px] sm:text-xs px-1.5 py-0.5 rounded-md border border-border text-muted-foreground shrink-0">
              #{shair.serial}
            </span>
          )}
          <span className="urdu text-lg sm:text-2xl text-gold shrink-0">{shair.start_letter}</span>
          <span className="text-muted-foreground font-ltr text-xs shrink-0">→</span>
          <span className="urdu text-lg sm:text-2xl text-gold shrink-0">{shair.end_letter}</span>
          {done && (
            <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-gold/20 text-gold font-ltr shrink-0">
              <Check className="h-3 w-3" /> played
            </span>
          )}
          {shair.is_attack && (
            <span title="Attack" className="inline-flex items-center gap-1 text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full bg-destructive/20 text-destructive font-ltr shrink-0">
              <Flame className="h-3 w-3" /> Attack
            </span>
          )}
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          <Link
            to="/shair/$id" params={{ id: shair.id }}
            className="p-1.5 rounded-md hover:bg-accent/60 text-muted-foreground"
            aria-label="View shair details" title="View details"
          >
            <Info className="h-4 w-4" />
          </Link>
          <button
            onClick={toggleFav} disabled={busy}
            className="p-1.5 rounded-md hover:bg-accent/60 disabled:opacity-50"
            aria-label={isFav ? "Remove favorite" : "Add favorite"}
            title={isFav ? "Remove favorite" : "Add favorite"}
          >
            <Bookmark className={`h-4 w-4 ${isFav ? "fill-gold text-gold" : "text-muted-foreground"}`} />
          </button>
          <button
            onClick={() => setFlagOpen(v => !v)} disabled={busy || flagged}
            className="p-1.5 rounded-md hover:bg-accent/60 disabled:opacity-50"
            aria-label={flagged ? "Already flagged" : "Report wrong shair"}
            title={flagged ? "Already flagged" : "Report wrong shair"}
          >
            <Flag className={`h-4 w-4 ${flagged ? "fill-destructive/60 text-destructive" : "text-muted-foreground"}`} />
          </button>
        </div>
      </div>

      <p className={`urdu ${compact ? "text-base sm:text-xl" : "text-lg sm:text-2xl leading-loose"} whitespace-pre-line text-parchment break-words`}>
        {shair.text_urdu}
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs sm:text-sm text-muted-foreground">
        {shair.poet?.name_urdu && <span className="urdu text-gold-muted">— {shair.poet.name_urdu}</span>}
        {shair.book?.title_urdu && <span className="urdu">| {shair.book.title_urdu}</span>}
        {shair.page_number && <span className="font-ltr text-xs">p.{shair.page_number}</span>}
      </div>

      {flagOpen && !flagged && (
        <div className="mt-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3 space-y-2">
          <p className="urdu text-sm text-parchment/90">اِس شعر میں کیا غلطی ہے؟</p>
          <textarea
            rows={2} value={flagReason} onChange={e => setFlagReason(e.target.value)} dir="rtl"
            placeholder="مثلاً: املا کی غلطی، حرف غلط ہے، مصرع نامکمل…"
            className="urdu w-full rounded-md bg-input border border-border p-2 text-sm focus:border-gold focus:outline-none"
          />
          <div className="flex gap-2 justify-end">
            <button onClick={() => setFlagOpen(false)} className="font-ltr text-xs px-3 py-1.5 rounded-md text-muted-foreground hover:bg-accent/50">Cancel</button>
            <button onClick={submitFlag} disabled={busy} className="font-ltr text-xs px-3 py-1.5 rounded-md bg-destructive text-destructive-foreground hover:opacity-90 disabled:opacity-50">Submit</button>
          </div>
        </div>
      )}
    </article>
  );
}

export function LetterChip({ letter, count, mode }: { letter: string; count?: number; mode: "start" | "end" }) {
  return (
    <div className="card-royal rounded-xl aspect-square flex flex-col items-center justify-center transition-all hover:border-gold hover:shadow-[var(--shadow-gold)] hover:-translate-y-0.5 cursor-pointer p-1">
      <span className="urdu text-xl sm:text-3xl md:text-4xl text-gold">{letter}</span>
      {typeof count === "number" && (
        <span className="font-ltr text-[10px] mt-1 text-muted-foreground">{count}</span>
      )}
      <span className="font-ltr text-[9px] text-muted-foreground/60 mt-0.5">{mode === "start" ? "start" : "end"}</span>
      {mode === "end" && <Shield className="h-3 w-3 mt-1 text-gold-muted" />}
    </div>
  );
}
