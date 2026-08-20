import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { useState } from "react";
import { Download, Filter, RotateCcw } from "lucide-react";
import { URDU_LETTERS } from "@/lib/urdu";
import { booksQuery, poetsQuery, shairFilteredQuery, type ShairSort } from "@/lib/queries";
import { ShairCard } from "@/components/shair-card";
import { Pagination, usePaged } from "@/components/pagination";
import { InlineSpinner, ShairListSkeleton } from "@/components/loading";
import { downloadCsv, shairToCsv } from "@/lib/csv";
import { Drawer, DrawerClose, DrawerContent, DrawerFooter, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";

const sortValues = ["serial_asc", "serial_desc", "popular", "newest", "shortest", "longest"] as const;

const searchSchema = z.object({
  start: z.string().optional(),
  end: z.string().optional(),
  poet: z.string().optional(),
  book: z.string().optional(),
  attack: z.enum(["any", "only", "none"]).default("any"),
  q: z.string().optional(),
  sort: z.enum(sortValues).default("serial_asc"),
});

export const Route = createFileRoute("/explore")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "تفصیلی فلٹر — Filter & Sort Urdu Shair | Bait Baazi" },
      { name: "description", content: "Filter Urdu shair by starting letter, ending letter, poet, book and difficulty, sort them, and export the results to CSV." },
      { property: "og:title", content: "Filter & Sort Urdu Shair — Bait Baazi" },
      { property: "og:description", content: "Combine start and end letter filters, sort results and export the collection as CSV." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Explore,
});

const SORT_LABELS: Record<ShairSort, string> = {
  serial_asc: "Serial ↑",
  serial_desc: "Serial ↓",
  popular: "Most popular",
  newest: "Newest first",
  shortest: "Shortest first",
  longest: "Longest first",
};

function Explore() {
  const sp = Route.useSearch();
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const filters = {
    start: sp.start, end: sp.end, poetId: sp.poet, bookId: sp.book,
    attack: sp.attack, q: sp.q, sort: sp.sort,
  };
  const { data, isPending, isFetching, error } = useQuery(shairFilteredQuery(filters));
  const poets = useQuery(poetsQuery());
  const books = useQuery(booksQuery());
  const rows = data ?? [];
  const paged = usePaged(rows, page);

  const set = (patch: Partial<typeof sp>) => {
    setPage(1);
    navigate({ to: "/explore", search: (prev) => ({ ...prev, ...patch }) });
  };
  const reset = () => { setPage(1); navigate({ to: "/explore", search: { attack: "any", sort: "serial_asc" } }); };

  const activeCount =
    (sp.start ? 1 : 0) + (sp.end ? 1 : 0) + (sp.poet ? 1 : 0) + (sp.book ? 1 : 0) +
    (sp.attack !== "any" ? 1 : 0) + (sp.q?.trim() ? 1 : 0);

  const selectCls = "urdu w-full rounded-lg bg-input border border-border px-2 py-2 text-sm focus:border-foreground focus:outline-none";

  const fields = (
    <div className="space-y-3">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3">
        <label className="space-y-1">
          <span className="font-ltr text-[11px] text-muted-foreground">Starts with</span>
          <select value={sp.start ?? ""} onChange={e => set({ start: e.target.value || undefined })} className={selectCls}>
            <option value="">Any</option>
            {URDU_LETTERS.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        </label>

        <label className="space-y-1">
          <span className="font-ltr text-[11px] text-muted-foreground">Ends with</span>
          <select value={sp.end ?? ""} onChange={e => set({ end: e.target.value || undefined })} className={selectCls}>
            <option value="">Any</option>
            {URDU_LETTERS.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        </label>

        <label className="space-y-1">
          <span className="font-ltr text-[11px] text-muted-foreground">Difficulty</span>
          <select value={sp.attack} onChange={e => set({ attack: e.target.value as "any" | "only" | "none" })} className={`${selectCls} font-ltr`}>
            <option value="any">All shair</option>
            <option value="only">Attack only</option>
            <option value="none">Non-attack</option>
          </select>
        </label>

        <label className="space-y-1">
          <span className="font-ltr text-[11px] text-muted-foreground">Poet</span>
          <select value={sp.poet ?? ""} onChange={e => set({ poet: e.target.value || undefined })} className={selectCls}>
            <option value="">Any</option>
            {(poets.data ?? []).map(p => <option key={p.id} value={p.id}>{p.name_urdu}</option>)}
          </select>
        </label>

        <label className="space-y-1">
          <span className="font-ltr text-[11px] text-muted-foreground">Book</span>
          <select value={sp.book ?? ""} onChange={e => set({ book: e.target.value || undefined })} className={selectCls}>
            <option value="">Any</option>
            {(books.data ?? []).map(b => <option key={b.id} value={b.id}>{b.title_urdu}</option>)}
          </select>
        </label>

        <label className="space-y-1">
          <span className="font-ltr text-[11px] text-muted-foreground">Sort by</span>
          <select value={sp.sort} onChange={e => set({ sort: e.target.value as ShairSort })} className={`${selectCls} font-ltr`}>
            {sortValues.map(s => <option key={s} value={s}>{SORT_LABELS[s]}</option>)}
          </select>
        </label>
      </div>

      <label className="block space-y-1">
        <span className="font-ltr text-[11px] text-muted-foreground">Contains text</span>
        <input
          defaultValue={sp.q ?? ""}
          onBlur={e => set({ q: e.target.value.trim() || undefined })}
          onKeyDown={e => { if (e.key === "Enter") set({ q: (e.target as HTMLInputElement).value.trim() || undefined }); }}
          dir="auto" placeholder="…"
          className="urdu w-full rounded-lg bg-input border border-border px-3 py-2 text-sm focus:border-foreground focus:outline-none"
        />
      </label>
    </div>
  );

  const resultBar = (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <span className="font-ltr text-xs text-muted-foreground">
        {isPending ? <InlineSpinner label="Loading…" /> : `${rows.length} result${rows.length === 1 ? "" : "s"}`}
        {!isPending && isFetching && <span className="ms-2"><InlineSpinner label="Updating…" /></span>}
      </span>
      <button
        onClick={() => downloadCsv(`bait-baazi-shair-${Date.now()}`, shairToCsv(rows))}
        disabled={rows.length === 0}
        className="font-ltr text-xs inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border hover:bg-accent disabled:opacity-40"
      >
        <Download className="h-3.5 w-3.5" /> Export CSV
      </button>
    </div>
  );

  return (
    <div className="space-y-5">
      <header className="text-center">
        <h1 className="urdu text-2xl sm:text-3xl mb-1">تفصیلی فلٹر</h1>
        <p className="font-ltr text-xs sm:text-sm text-muted-foreground">
          Combine start letter, end letter, poet, book and difficulty — then sort or export.
        </p>
      </header>

      {/* Mobile: filter drawer */}
      <div className="md:hidden space-y-3">
        <div className="flex items-center gap-2">
          <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
            <DrawerTrigger asChild>
              <button className="font-ltr flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg border border-border bg-card text-sm hover:bg-accent">
                <Filter className="h-4 w-4" /> Filters
                {activeCount > 0 && (
                  <span className="font-ltr ms-1 rounded-full bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5">{activeCount}</span>
                )}
              </button>
            </DrawerTrigger>
            <DrawerContent className="max-h-[88vh]">
              <DrawerHeader className="pb-2">
                <DrawerTitle className="urdu text-lg text-start">فلٹرز</DrawerTitle>
              </DrawerHeader>
              <div className="overflow-y-auto px-4 pb-2">{fields}</div>
              <DrawerFooter className="flex-row gap-2 pt-2">
                <button onClick={reset} className="font-ltr flex-1 inline-flex items-center justify-center gap-1 px-3 py-2.5 rounded-lg border border-border text-sm hover:bg-accent">
                  <RotateCcw className="h-3.5 w-3.5" /> Reset
                </button>
                <DrawerClose asChild>
                  <button className="font-ltr flex-1 px-3 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm">
                    {isPending ? "Show results" : `Show ${rows.length} result${rows.length === 1 ? "" : "s"}`}
                  </button>
                </DrawerClose>
              </DrawerFooter>
            </DrawerContent>
          </Drawer>
          <button onClick={reset} className="font-ltr px-3 py-2.5 rounded-lg border border-border text-sm hover:bg-accent" aria-label="Reset filters">
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>
        {resultBar}
      </div>

      {/* Desktop: inline panel */}
      <section className="hidden md:block card-royal rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-ltr text-xs uppercase tracking-wider text-muted-foreground inline-flex items-center gap-1.5">
            <Filter className="h-3.5 w-3.5" /> Filters
          </span>
          <button onClick={reset} className="font-ltr text-xs inline-flex items-center gap-1 px-2 py-1 rounded-md border border-border hover:bg-accent">
            <RotateCcw className="h-3 w-3" /> Reset
          </button>
        </div>
        {fields}
        <div className="pt-1">{resultBar}</div>
      </section>


      {error && <p className="text-center text-sm text-destructive font-ltr">{(error as Error).message}</p>}

      {isPending ? (
        <ShairListSkeleton />
      ) : rows.length === 0 ? (
        <p className="urdu text-center text-muted-foreground py-16 text-xl">اِن فلٹرز کے مطابق کوئی شعر نہیں</p>
      ) : (
        <>
          <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
            {paged.slice.map(s => <ShairCard key={s.id} shair={s} />)}
          </div>
          <Pagination page={paged.page} totalPages={paged.totalPages} onChange={setPage} />
        </>
      )}
    </div>
  );
}
