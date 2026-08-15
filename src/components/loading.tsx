import { Loader2 } from "lucide-react";

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-muted/40 ${className}`} />;
}

export function ShairCardSkeleton() {
  return (
    <div className="card-royal rounded-2xl p-3 sm:p-5 space-y-3">
      <div className="flex items-center gap-2">
        <Skeleton className="h-4 w-10" />
        <Skeleton className="h-6 w-6 rounded-full" />
        <Skeleton className="h-6 w-6 rounded-full" />
      </div>
      <Skeleton className="h-5 w-[92%]" />
      <Skeleton className="h-5 w-[78%]" />
      <Skeleton className="h-3 w-32" />
    </div>
  );
}

export function ShairListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-3 sm:gap-4 md:grid-cols-2" aria-busy="true" aria-label="Loading shair">
      {Array.from({ length: count }).map((_, i) => <ShairCardSkeleton key={i} />)}
    </div>
  );
}

export function PageSpinner({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
      <Loader2 className="h-6 w-6 animate-spin" />
      <p className="font-ltr text-sm">{label}</p>
    </div>
  );
}

export function InlineSpinner({ label }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 font-ltr text-xs text-muted-foreground">
      <Loader2 className="h-3.5 w-3.5 animate-spin" /> {label}
    </span>
  );
}
