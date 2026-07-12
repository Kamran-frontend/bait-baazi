import type { Shair } from "@/lib/queries";
import { Bookmark, Flame, Shield } from "lucide-react";

export function ShairCard({ shair, onFavorite, isFavorite, compact }: {
  shair: Shair;
  onFavorite?: (id: string) => void;
  isFavorite?: boolean;
  compact?: boolean;
}) {
  return (
    <article className="card-royal rounded-2xl p-5 sm:p-6 transition-transform hover:-translate-y-0.5">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl text-gold font-ltr">{shair.start_letter}</span>
          <span className="text-muted-foreground font-ltr text-xs">→</span>
          <span className="text-2xl text-gold font-ltr">{shair.end_letter}</span>
        </div>
        <div className="flex items-center gap-1.5">
          {shair.is_attack && (
            <span title="Attack" className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-destructive/20 text-destructive font-ltr">
              <Flame className="h-3 w-3" /> Attack
            </span>
          )}
          {onFavorite && (
            <button onClick={() => onFavorite(shair.id)} className="p-1.5 rounded-md hover:bg-accent/60" aria-label="Bookmark">
              <Bookmark className={`h-4 w-4 ${isFavorite ? "fill-gold text-gold" : "text-muted-foreground"}`} />
            </button>
          )}
        </div>
      </div>
      <p className={`urdu ${compact ? "text-xl" : "urdu-lg"} whitespace-pre-line text-parchment`}>
        {shair.text_urdu}
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
        {shair.poet?.name_urdu && <span className="urdu text-gold-muted">— {shair.poet.name_urdu}</span>}
        {shair.book?.title_urdu && <span className="urdu">| {shair.book.title_urdu}</span>}
        {shair.category && <span className="urdu">| {shair.category}</span>}
        {shair.page_number && <span className="font-ltr text-xs">p.{shair.page_number}</span>}
      </div>
    </article>
  );
}

export function LetterChip({ letter, count, mode }: { letter: string; count?: number; mode: "start" | "end" }) {
  return (
    <div className="card-royal rounded-xl aspect-square flex flex-col items-center justify-center transition-all hover:border-gold hover:shadow-[var(--shadow-gold)] hover:-translate-y-0.5 cursor-pointer">
      <span className="urdu text-3xl sm:text-4xl text-gold">{letter}</span>
      {typeof count === "number" && (
        <span className="font-ltr text-[10px] mt-1 text-muted-foreground">{count}</span>
      )}
      <span className="font-ltr text-[9px] text-muted-foreground/60 mt-0.5">{mode === "start" ? "start" : "end"}</span>
      {mode === "end" && <Shield className="h-3 w-3 mt-1 text-gold-muted" />}
    </div>
  );
}
