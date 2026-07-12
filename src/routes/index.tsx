import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { shairStatsQuery, shairByStartLetterQuery } from "@/lib/queries";
import { URDU_LETTERS } from "@/lib/urdu";
import { ShairCard, LetterChip } from "@/components/shair-card";
import { BookOpen, Search, Swords, Sparkles } from "lucide-react";

export const Route = createFileRoute("/")({
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(shairStatsQuery()),
      context.queryClient.ensureQueryData(shairByStartLetterQuery("ا")),
    ]);
  },
  head: () => ({
    meta: [
      { title: "بیت بازی — Urdu Bait Baazi | AI Shair Library" },
      { name: "description", content: "Play Bait Baazi against an AI opponent trained on classical Urdu poetry. Browse shair by every Urdu alphabet." },
    ],
  }),
  component: Home,
});

function Home() {
  const { data: stats } = useSuspenseQuery(shairStatsQuery());
  const { data: aShair } = useSuspenseQuery(shairByStartLetterQuery("ا"));
  const featured = aShair.slice(0, 3);

  return (
    <div className="space-y-10">
      {/* Hero */}
      <section className="text-center py-8 sm:py-12">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-gold/30 text-gold text-xs font-ltr mb-4">
          <Sparkles className="h-3 w-3" /> AI-Powered • Classical Urdu Poetry
        </div>
        <h1 className="urdu text-4xl sm:text-6xl text-gold mb-3">بیت بازی</h1>
        <p className="urdu text-lg sm:text-2xl text-parchment/90 max-w-2xl mx-auto">
          کلاسیکی اردو شاعری کا سب سے بڑا خزانہ — ہر حرف پر شعر، ہر شعر پر جواب
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link to="/play" className="bg-gold-gradient rounded-lg px-6 py-3 font-ltr font-semibold inline-flex items-center gap-2 shadow-[var(--shadow-gold)] hover:opacity-90">
            <Swords className="h-4 w-4" /> Play Bait Baazi
          </Link>
          <Link to="/browse" className="border border-gold/40 text-gold rounded-lg px-6 py-3 font-ltr font-semibold inline-flex items-center gap-2 hover:bg-gold/10">
            <BookOpen className="h-4 w-4" /> Browse Letters
          </Link>
          <Link to="/search" className="border border-gold/20 text-parchment/90 rounded-lg px-6 py-3 font-ltr font-semibold inline-flex items-center gap-2 hover:bg-accent/50">
            <Search className="h-4 w-4" /> Search
          </Link>
        </div>
      </section>

      {/* Stats */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label="Shair" value={stats.totalShair} />
        <Stat label="Poets" value={stats.totalPoets} />
        <Stat label="Books" value={stats.totalBooks} />
        <Stat label="Letters" value={URDU_LETTERS.length} />
      </section>

      {/* Alphabet quick jump */}
      <section>
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="urdu text-2xl text-gold">حروفِ تہجی</h2>
          <Link to="/browse" className="font-ltr text-xs text-gold-muted hover:text-gold">View all →</Link>
        </div>
        <div className="grid grid-cols-6 sm:grid-cols-9 md:grid-cols-12 gap-2">
          {URDU_LETTERS.map(l => (
            <Link key={l} to="/letter/$mode/$letter" params={{ mode: "start", letter: l }}>
              <LetterChip letter={l} count={stats.countsByLetter[l] ?? 0} mode="start" />
            </Link>
          ))}
        </div>
      </section>

      {/* Featured */}
      <section>
        <h2 className="urdu text-2xl text-gold mb-4">منتخب اشعار</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {featured.map(s => <ShairCard key={s.id} shair={s} />)}
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="card-royal rounded-xl p-4 text-center">
      <div className="text-3xl text-gold font-ltr font-bold">{value.toLocaleString()}</div>
      <div className="font-ltr text-xs text-muted-foreground mt-1 uppercase tracking-wider">{label}</div>
    </div>
  );
}
