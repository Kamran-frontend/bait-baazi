import { ChevronLeft, ChevronRight } from "lucide-react";

export const PAGE_SIZE = 20;

export function usePaged<T>(items: T[], page: number, pageSize = PAGE_SIZE) {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safe = Math.min(Math.max(1, page), totalPages);
  const start = (safe - 1) * pageSize;
  return { page: safe, totalPages, total, start, slice: items.slice(start, start + pageSize) };
}

export function Pagination({ page, totalPages, onChange }: { page: number; totalPages: number; onChange: (p: number) => void }) {
  if (totalPages <= 1) return null;
  const go = (p: number) => onChange(Math.min(Math.max(1, p), totalPages));
  return (
    <nav className="flex items-center justify-center gap-1 sm:gap-2 mt-4 font-ltr text-sm" aria-label="Pagination">
      <button onClick={() => go(page - 1)} disabled={page <= 1}
        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-border disabled:opacity-40 hover:bg-accent">
        <ChevronLeft className="h-3.5 w-3.5" /> Prev
      </button>
      <span className="text-muted-foreground px-2">Page {page} / {totalPages}</span>
      <button onClick={() => go(page + 1)} disabled={page >= totalPages}
        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-border disabled:opacity-40 hover:bg-accent">
        Next <ChevronRight className="h-3.5 w-3.5" />
      </button>
    </nav>
  );
}
