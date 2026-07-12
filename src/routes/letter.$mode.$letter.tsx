import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { shairByStartLetterQuery, shairByEndLetterQuery } from "@/lib/queries";
import { URDU_LETTERS, isAttackLetter } from "@/lib/urdu";
import { ShairCard } from "@/components/shair-card";
import { ArrowRight, Flame, Shield } from "lucide-react";

export const Route = createFileRoute("/letter/$mode/$letter")({
  loader: async ({ context, params }) => {
    if (params.mode !== "start" && params.mode !== "end") throw notFound();
    if (!(URDU_LETTERS as readonly string[]).includes(params.letter)) throw notFound();
    const opts = params.mode === "start"
      ? shairByStartLetterQuery(params.letter)
      : shairByEndLetterQuery(params.letter);
    await context.queryClient.ensureQueryData(opts);
  },
  head: ({ params }) => ({
    meta: [
      { title: `${params.mode === "start" ? "شروع" : "اختتام"} - ${params.letter} — Bait Baazi` },
      { name: "description", content: `Shair ${params.mode === "start" ? "starting" : "ending"} with the Urdu letter ${params.letter}.` },
    ],
  }),
  notFoundComponent: () => <p className="text-center py-16 urdu text-xl">حرف موجود نہیں</p>,
  errorComponent: ({ error }) => <p className="text-center py-16 text-destructive">{error.message}</p>,
  component: LetterPage,
});

function LetterPage() {
  const { mode, letter } = Route.useParams();
  const opts = mode === "start" ? shairByStartLetterQuery(letter) : shairByEndLetterQuery(letter);
  const { data } = useSuspenseQuery(opts);
  const isAttack = mode === "end" && isAttackLetter(letter);

  return (
    <div className="space-y-6">
      <Link to="/browse" search={{ mode: mode as "start" | "end" }} className="font-ltr text-xs text-gold-muted hover:text-gold inline-flex items-center gap-1">
        <ArrowRight className="h-3 w-3 rotate-180" /> Back to letters
      </Link>

      <header className="text-center card-royal rounded-2xl p-8">
        <div className="urdu text-8xl text-gold leading-none">{letter}</div>
        <p className="urdu text-lg text-parchment mt-4">
          {mode === "start" ? "اِس حرف سے شروع ہونے والے اشعار" : "اِس حرف پر ختم ہونے والے اشعار"}
        </p>
        <p className="font-ltr text-sm text-muted-foreground mt-1">{data.length} results</p>
        {isAttack && (
          <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-destructive/20 text-destructive text-xs font-ltr">
            <Flame className="h-3 w-3" /> Attack letter — hard for opponent
          </div>
        )}
        {mode === "end" && (
          <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gold/10 text-gold text-xs font-ltr">
            <Shield className="h-3 w-3" /> Defense — replies starting with {letter}
          </div>
        )}
      </header>

      {data.length === 0 ? (
        <p className="urdu text-center text-muted-foreground py-16 text-xl">اِس حرف کے لیے ابھی کوئی شعر موجود نہیں</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {data.map(s => <ShairCard key={s.id} shair={s} />)}
        </div>
      )}
    </div>
  );
}
