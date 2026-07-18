import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { shairStatsQuery, shairByStartLetterQuery } from "@/lib/queries";
import { URDU_LETTERS } from "@/lib/urdu";
import { ShairCard, LetterChip } from "@/components/shair-card";
import { BookOpen, GraduationCap, Search, Swords } from "lucide-react";
const LOGO_URL = "/logo.png";

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
      <section className="text-center py-6 sm:py-10">
        <img src={logoAsset.url} alt="Bait Baazi" className="mx-auto h-20 sm:h-32 w-auto mb-6" />
        <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
          <Link to="/play" className="bg-gold-gradient rounded-lg px-4 sm:px-6 py-2.5 sm:py-3 font-ltr text-sm sm:text-base font-semibold inline-flex items-center gap-2 hover:opacity-90">
            <Swords className="h-4 w-4" /> Play
          </Link>
          <Link to="/practice" className="border border-border text-foreground rounded-lg px-4 sm:px-6 py-2.5 sm:py-3 font-ltr text-sm sm:text-base font-semibold inline-flex items-center gap-2 hover:bg-accent">
            <GraduationCap className="h-4 w-4" /> Practice
          </Link>
          <Link to="/browse" className="border border-border text-foreground rounded-lg px-4 sm:px-6 py-2.5 sm:py-3 font-ltr text-sm sm:text-base font-semibold inline-flex items-center gap-2 hover:bg-accent">
            <BookOpen className="h-4 w-4" /> Browse
          </Link>
          <Link to="/search" className="border border-border text-foreground rounded-lg px-4 sm:px-6 py-2.5 sm:py-3 font-ltr text-sm sm:text-base font-semibold inline-flex items-center gap-2 hover:bg-accent">
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
