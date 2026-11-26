import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BookOpen, Check, Loader2, Pencil, User, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Pagination, usePaged } from "@/components/pagination";
import { readAllEditorRows } from "@/lib/admin-editor";

type Poet = { id: string; name_urdu: string; name_english: string | null; era: string | null; bio: string | null };
type Book = { id: string; title_urdu: string; title_english: string | null; poet_id: string | null; page_count: number | null };
const input = "rounded-md bg-input border border-border p-2.5 focus:outline-none focus:ring-1 focus:ring-ring w-full text-sm";

export function LibraryEditor() {
  const qc = useQueryClient();
  const [poetPage, setPoetPage] = useState(1);
  const [bookPage, setBookPage] = useState(1);
  const [notice, setNotice] = useState("");
  const poets = useQuery({ queryKey: ["admin", "poets-full"], queryFn: () => readAllEditorRows<Poet>(async (from, to) => {
    const { data, error } = await supabase.from("poets").select("id, name_urdu, name_english, era, bio").order("name_urdu").order("id").range(from, to);
    if (error) throw error; return data ?? [];
  }) });
  const books = useQuery({ queryKey: ["admin", "books-full"], queryFn: () => readAllEditorRows<Book>(async (from, to) => {
    const { data, error } = await supabase.from("books").select("id, title_urdu, title_english, poet_id, page_count").order("title_urdu").order("id").range(from, to);
    if (error) throw error; return data ?? [];
  }) });
  const done = async () => { await qc.invalidateQueries(); setNotice("Changes saved."); };
  const pp = usePaged(poets.data ?? [], poetPage);
  const bp = usePaged(books.data ?? [], bookPage);
  return (
    <section className="space-y-6 border-t border-border pt-6">
      <p role="status" className="font-ltr text-sm text-muted-foreground">{notice}</p>
      <div>
        <h2 className="urdu text-lg sm:text-xl mb-3 inline-flex items-center gap-2"><User className="h-4 w-4" /> شعراء</h2>
        {poets.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : poets.isError ? <p role="alert">Could not load poets.</p> : (
          <div className="space-y-2">
            {pp.slice.map(p => <PoetRow key={`${p.id}:${JSON.stringify(p)}`} poet={p} onDone={done} />)}
            {!pp.total && <p className="text-muted-foreground text-sm font-ltr">No poets yet.</p>}
            <Pagination page={pp.page} totalPages={pp.totalPages} onChange={setPoetPage} />
          </div>
        )}
      </div>
      <div>
        <h2 className="urdu text-lg sm:text-xl mb-3 inline-flex items-center gap-2"><BookOpen className="h-4 w-4" /> کتب</h2>
        {books.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : books.isError ? <p role="alert">Could not load books.</p> : (
          <div className="space-y-2">
            {bp.slice.map(b => <BookRow key={`${b.id}:${JSON.stringify(b)}`} book={b} poets={poets.data ?? []} onDone={done} />)}
            {!bp.total && <p className="text-muted-foreground text-sm font-ltr">No books yet.</p>}
            <Pagination page={bp.page} totalPages={bp.totalPages} onChange={setBookPage} />
          </div>
        )}
      </div>
    </section>
  );
}

function PoetRow({ poet, onDone }: { poet: Poet; onDone: () => Promise<void> }) {
  const [editing, setEditing] = useState(false);
  const initial = { name_urdu: poet.name_urdu, name_english: poet.name_english ?? "", era: poet.era ?? "", bio: poet.bio ?? "" };
  const [f, setF] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  if (!editing) return (
    <div className="flex items-center justify-between gap-2 border-b border-border pb-2">
      <div className="min-w-0"><p className="urdu text-base break-words">{poet.name_urdu}</p>
        <p className="font-ltr text-xs text-muted-foreground break-words">{[poet.name_english, poet.era].filter(Boolean).join(" · ")}</p>
      </div>
      <Button variant="ghost" size="icon" onClick={() => { setF(initial); setErr(""); setEditing(true); }} aria-label={`Edit poet ${poet.name_urdu}`} title="Edit poet"><Pencil /></Button>
    </div>
  );
  return (
    <form className="border border-border rounded-lg p-3 space-y-3" onSubmit={async e => {
      e.preventDefault(); if (!f.name_urdu.trim()) { setErr("Urdu name is required."); return; }
      setBusy(true); setErr("");
      try {
        const { error } = await supabase.from("poets").update({ name_urdu: f.name_urdu.trim(), name_english: f.name_english.trim() || null, era: f.era.trim() || null, bio: f.bio.trim() || null }).eq("id", poet.id).select("id").single();
        if (error) throw error;
        setEditing(false); await onDone();
      } catch { setErr("Could not save this poet. Please try again."); } finally { setBusy(false); }
    }}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="font-ltr text-xs space-y-1 block">Urdu name<input required dir="rtl" className={`urdu ${input}`} value={f.name_urdu} onChange={e => setF({ ...f, name_urdu: e.target.value })} /></label>
        <label className="font-ltr text-xs space-y-1 block">English name<input className={input} value={f.name_english} onChange={e => setF({ ...f, name_english: e.target.value })} /></label>
        <label className="font-ltr text-xs space-y-1 block">Era<input className={input} value={f.era} onChange={e => setF({ ...f, era: e.target.value })} /></label>
      </div>
      <label className="font-ltr text-xs space-y-1 block">Biography<textarea dir="rtl" rows={3} className={`urdu ${input}`} value={f.bio} onChange={e => setF({ ...f, bio: e.target.value })} /></label>
      <Actions busy={busy} err={err} onCancel={() => setEditing(false)} />
    </form>
  );
}

function BookRow({ book, poets, onDone }: { book: Book; poets: Poet[]; onDone: () => Promise<void> }) {
  const [editing, setEditing] = useState(false);
  const initial = { title_urdu: book.title_urdu, title_english: book.title_english ?? "", poet_id: book.poet_id ?? "", page_count: book.page_count != null ? String(book.page_count) : "" };
  const [f, setF] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  if (!editing) return (
    <div className="flex items-center justify-between gap-2 border-b border-border pb-2">
      <div className="min-w-0"><p className="urdu text-base break-words">{book.title_urdu}</p>
        <p className="font-ltr text-xs text-muted-foreground break-words">{[book.title_english, poets.find(p => p.id === book.poet_id)?.name_urdu, book.page_count != null ? `${book.page_count} pages` : null].filter(Boolean).join(" · ")}</p>
      </div>
      <Button variant="ghost" size="icon" onClick={() => { setF(initial); setErr(""); setEditing(true); }} aria-label={`Edit book ${book.title_urdu}`} title="Edit book"><Pencil /></Button>
    </div>
  );
  return (
    <form className="border border-border rounded-lg p-3 space-y-3" onSubmit={async e => {
      e.preventDefault(); if (!f.title_urdu.trim()) { setErr("Urdu title is required."); return; }
      const n = f.page_count.trim() ? Number(f.page_count) : null;
      if (n !== null && (!Number.isInteger(n) || n < 1)) { setErr("Enter a positive whole page count."); return; }
      setBusy(true); setErr("");
      try {
        const { error } = await supabase.from("books").update({ title_urdu: f.title_urdu.trim(), title_english: f.title_english.trim() || null, poet_id: f.poet_id || null, page_count: n }).eq("id", book.id).select("id").single();
        if (error) throw error;
        setEditing(false); await onDone();
      } catch { setErr("Could not save this book. Please try again."); } finally { setBusy(false); }
    }}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="font-ltr text-xs space-y-1 block">Urdu title<input required dir="rtl" className={`urdu ${input}`} value={f.title_urdu} onChange={e => setF({ ...f, title_urdu: e.target.value })} /></label>
        <label className="font-ltr text-xs space-y-1 block">English title<input className={input} value={f.title_english} onChange={e => setF({ ...f, title_english: e.target.value })} /></label>
        <label className="font-ltr text-xs space-y-1 block">Poet<select dir="rtl" className={`urdu ${input}`} value={f.poet_id} onChange={e => setF({ ...f, poet_id: e.target.value })}>
          <option value="">—</option>{poets.map(p => <option key={p.id} value={p.id}>{p.name_urdu}</option>)}
        </select></label>
        <label className="font-ltr text-xs space-y-1 block">Page count<input type="number" min="1" step="1" className={input} value={f.page_count} onChange={e => setF({ ...f, page_count: e.target.value })} /></label>
      </div>
      <Actions busy={busy} err={err} onCancel={() => setEditing(false)} />
    </form>
  );
}

function Actions({ busy, err, onCancel }: { busy: boolean; err: string; onCancel: () => void }) {
  return <div>
    {err && <p role="alert" className="text-destructive text-xs font-ltr mb-2">{err}</p>}
    <div className="flex justify-end gap-2 font-ltr">
      <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={onCancel}><X /> Cancel</Button>
      <Button type="submit" size="sm" disabled={busy}>{busy ? <Loader2 className="animate-spin" /> : <Check />} Save</Button>
    </div>
  </div>;
}
