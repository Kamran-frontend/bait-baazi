import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { shairStatsQuery } from "@/lib/queries";
import { URDU_LETTERS, ATTACK_LETTERS } from "@/lib/urdu";
import { LetterChip } from "@/components/shair-card";
import { useState } from "react";
import { Flame } from "lucide-react";
import { z } from "zod";

const search = z.object({ mode: z.enum(["start", "end"]).default("start") });

export const Route = createFileRoute("/browse")({
  validateSearch: search,
  loaderDeps: ({ search }) => ({ mode: search.mode }),
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(shairStatsQuery());
  },
  head: () => ({
    meta: [
      { title: "حروف — Browse Urdu Poetry by Letter | Bait Baazi" },
      { name: "description", content: "Browse every Urdu shair organized by starting or ending letter for perfect Bait Baazi strategy." },
    ],
  }),
  component: Browse,
});

function Browse() {
  const { mode } = Route.useSearch();
  const { data: stats } = useSuspenseQuery(shairStatsQuery());
  const navigate = useNavigate();
  const [tab, setTab] = useState<"start" | "end">(mode);

  return (
    <div className="space-y-6">
      <header className="text-center">
        <h1 className="urdu text-3xl text-gold mb-2">حروف کا انتخاب</h1>
        <p className="urdu text-muted-foreground">شروع یا اختتام کے حرف سے اشعار دیکھیں</p>
      </header>

      <div className="flex justify-center gap-2">
        {(["start","end"] as const).map(k => (
          <button
            key={k}
            onClick={() => { setTab(k); navigate({ to: "/browse", search: { mode: k } }); }}
            className={`px-4 py-2 rounded-lg font-ltr text-sm ${tab === k ? "bg-gold-gradient text-primary-foreground" : "border border-gold/30 text-gold hover:bg-gold/10"}`}
          >
            {k === "start" ? "Starts with" : "Ends with"}
          </button>
        ))}
      </div>

      {tab === "end" && (
        <div className="card-royal rounded-xl p-4 text-center">
          <p className="urdu text-parchment/90">
            <Flame className="inline h-4 w-4 text-destructive me-1" />
            مشکل اختتامی حروف: {ATTACK_LETTERS.join(" • ")}
          </p>
        </div>
      )}

      <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 gap-3">
        {URDU_LETTERS.map(l => (
          <Link key={l} to="/letter/$mode/$letter" params={{ mode: tab, letter: l }}>
            <LetterChip letter={l} count={stats.countsByLetter[l] ?? 0} mode={tab} />
          </Link>
        ))}
      </div>
    </div>
  );
}
