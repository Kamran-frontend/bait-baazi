import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { shairByIdQuery, shairByStartLetterQuery } from "@/lib/queries";
import { isAttackLetter } from "@/lib/urdu";
import { ShairCard } from "@/components/shair-card";
import { PageSpinner } from "@/components/loading";
import { ArrowRight, Copy, Download, Flame } from "lucide-react";
import { downloadCsv, shairToCsv } from "@/lib/csv";
import { useState } from "react";

export const Route = createFileRoute("/shair/$id")({
  loader: async ({ context, params }) => {
    const shair = await context.queryClient.ensureQueryData(shairByIdQuery(params.id));
    if (!shair) throw notFound();
    return { title: shair.text_urdu.split("\n")[0].slice(0, 60), serial: shair.serial };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return { meta: [{ title: "شعر دستیاب نہیں — Bait Baazi" }, { name: "robots", content: "noindex" }] };
    }
    const t = `${loaderData.title} — شعر #${loaderData.serial ?? ""} | Bait Baazi`;
    const d = `Full details for this Urdu shair: starting letter, ending letter, poet, book and page reference.`;
    return {
      meta: [
        { title: t },
        { name: "description", content: d },
        { property: "og:title", content: t },
        { property: "og:description", content: d },
        { property: "og:type", content: "article" },
        { name: "twitter:card", content: "summary" },
      ],
    };
  },
  pendingComponent: () => <PageSpinner label="Loading shair…" />,
  notFoundComponent: () => <p className="text-center py-16 urdu text-xl">یہ شعر موجود نہیں</p>,
  errorComponent: ({ error }) => <p className="text-center py-16 text-destructive font-ltr">{(error as Error).message}</p>,
  component: ShairDetail,
});

function ShairDetail() {
  const { id } = Route.useParams();
  const { data: shair } = useSuspenseQuery(shairByIdQuery(id));
  const { data: related } = useSuspenseQuery(shairByStartLetterQuery(shair?.end_letter ?? "ا"));
  const [copied, setCopied] = useState(false);

  if (!shair) return null;
  const replies = related.filter(r => r.id !== shair.id).slice(0, 4);

  const copy = async () => {
    await navigator.clipboard.writeText(shair.text_urdu);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="space-y-6">
      <Link to="/explore" className="font-ltr text-xs text-gold-muted hover:text-gold inline-flex items-center gap-1">
        <ArrowRight className="h-3 w-3 rotate-180" /> Back to filters
      </Link>

      <article className="card-royal rounded-2xl p-4 sm:p-8 space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          {shair.serial != null && (
            <span className="font-ltr text-xs px-2 py-0.5 rounded-md border border-border text-muted-foreground">#{shair.serial}</span>
          )}
          {shair.is_attack && (
            <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-destructive/20 text-destructive font-ltr">
              <Flame className="h-3 w-3" /> Attack
            </span>
          )}
          {isAttackLetter(shair.end_letter) && (
            <span className="font-ltr text-xs text-muted-foreground">hard ending letter</span>
          )}
        </div>

        <p className="urdu text-xl sm:text-3xl leading-loose whitespace-pre-line text-parchment break-words">
          {shair.text_urdu}
        </p>

        <dl className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <Detail label="Starts with"><span className="urdu text-2xl text-gold">{shair.start_letter}</span></Detail>
          <Detail label="Ends with"><span className="urdu text-2xl text-gold">{shair.end_letter}</span></Detail>
          <Detail label="Poet"><span className="urdu">{shair.poet?.name_urdu ?? "—"}</span></Detail>
          <Detail label="Book"><span className="urdu">{shair.book?.title_urdu ?? "—"}</span></Detail>
          <Detail label="Page"><span className="font-ltr">{shair.page_number ?? "—"}</span></Detail>
          <Detail label="Popularity"><span className="font-ltr">{shair.popularity ?? 0}</span></Detail>
        </dl>

        <div className="flex flex-wrap gap-2">
          <button onClick={copy} className="font-ltr text-xs inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border hover:bg-accent">
            <Copy className="h-3.5 w-3.5" /> {copied ? "Copied" : "Copy shair"}
          </button>
          <button
            onClick={() => downloadCsv(`shair-${shair.serial ?? shair.id}`, shairToCsv([shair]))}
            className="font-ltr text-xs inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border hover:bg-accent"
          >
            <Download className="h-3.5 w-3.5" /> Export CSV
          </button>
          <Link
            to="/letter/$mode/$letter" params={{ mode: "start", letter: shair.end_letter }}
            className="font-ltr text-xs inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border hover:bg-accent"
          >
            Possible replies ({shair.end_letter})
          </Link>
        </div>
      </article>

      {replies.length > 0 && (
        <section className="space-y-3">
          <h2 className="urdu text-xl text-gold">ممکنہ جواب</h2>
          <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
            {replies.map(r => <ShairCard key={r.id} shair={r} compact />)}
          </div>
        </section>
      )}
    </div>
  );
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border p-3">
      <dt className="font-ltr text-[11px] uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="mt-1">{children}</dd>
    </div>
  );
}
