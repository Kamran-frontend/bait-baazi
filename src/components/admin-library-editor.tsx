import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BookOpen, Check, Loader2, Pencil, Plus, Trash2, User, X } from "lucide-react";

type Poet = { id: string; name_urdu: string; name_english: string | null; era: string | null; bio: string | null };
type Book = { id: string; title_urdu: string; title_english: string | null; poet_id: string | null; page_count: number | null };

const input = "rounded-lg bg-input border border-border p-2 focus:outline-none w-full text-sm";

export function LibraryEditor() {
  const qc = useQueryClient();
  const poets = useQuery({ queryKey: ["admin", "poets-full"], queryFn: async () => {
    const { data, error } = await supabase.from("poets").select("id, name_urdu, name_english, era, bio").order("name_urdu");
    if (error) throw error; return (data ?? []) as Poet[];
  } });
  const books = useQuery({ queryKey: ["admin", "books-full"], queryFn: async () => {
    const { data, error } = await supabase.from("books").select("id, title_urdu, title_english, poet_id, page_count").order("title_urdu");
    if (error) throw error; return (data ?? []) as Book[];
  } });
  const refresh = () => qc.invalidateQueries();

  return (
    <section className="card-royal rounded-2xl p-4 sm:p-6 space-y-6">
      <div>
        <h2 className="urdu text-lg sm:text-xl mb-3 inline-flex items-center gap-2"><User className="h-4 w-4" /> شعراء</h2>
        {poets.isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : (
          <div className="space-y-2">
            {(poets.data ?? []).map(p => <PoetRow key={p.id} poet={p} onDone={refresh} />)}
            <PoetRow onDone={refresh} />
          </div>
        )}
      </div>
      <div>
        <h2 className="urdu text-lg sm:text-xl mb-3 inline-flex items-center gap-2"><BookOpen className="h-4 w-4" /> کتب</h2>
        {books.isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : (
          <div className="space-y-2">
            {(books.data ?? []).map(b => <BookRow key={b.id} book={b} poets={poets.data ?? []} onDone={refresh} />)}
            <BookRow poets={poets.data ?? []} onDone={refresh} />
          </div>
        )}
      </div>
    </section>
  );
}

function PoetRow({ poet, onDone }: { poet?: Poet; onDone: () => void }) {
  const [editing, setEditing] = useState(false);
  const [f, setF] = useState({ name_urdu: poet?.name_urdu ?? "", name_english: poet?.name_english ?? "", era: poet?.era ?? "", bio: poet?.bio ?? "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  if (!editing) {
    return poet ? (
      <div className="flex items-center justify-between gap-2 border-b border-border/50 pb-2">
        <div className="min-w-0">
          <p className="urdu text-base break-words">{poet.name_urdu}</p>
          {(poet.name_english || poet.era) && <p className="font-ltr text-xs text-muted-foreground">{[poet.name_english, poet.era].filter(Boolean).join(" · ")}</p>}
        </div>
        <button onClick={() => setEditing(true)} className="p-2 rounded-md hover:bg-accent/50" aria-label="Edit poet"><Pencil className="h-4 w-4" /></button>
      </div>
    ) : (
      <button onClick={() => setEditing(true)} className="font-ltr text-xs inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-border hover:bg-accent"><Plus className="h-3.5 w-3.5" /> Add poet</button>
    );
  }
  const saveIt = async () => {
    if (!f.name_urdu.trim()) { setErr("Urdu name is required"); return; }
    setBusy(true); setErr("");
    const row = { name_urdu: f.name_urdu.trim(), name_english: f.name_english.trim() || null, era: f.era.trim() || null, bio: f.bio.trim() || null };
    const { error } = poet ? await supabase.from("poets").update(row).eq("id", poet.id) : await supabase.from("poets").insert(row);
    setBusy(false);
    if (error) { setErr(error.message); return; }
    setEditing(false); onDone();
  };
  const del = async () => {
    if (!poet || !confirm("Delete this poet? Their shair and books will stay, without a poet.")) return;
    setBusy(true);
    await supabase.from("shair").update({ poet_id: null }).eq("poet_id", poet.id);
    await supabase.from("books").update({ poet_id: null }).eq("poet_id", poet.id);
    const { error } = await supabase.from("poets").delete().eq("id", poet.id);
    setBusy(false);
    if (error) { setErr(error.message); return; }
    onDone();
  };
  return (
    <div className="border border-border rounded-lg p-3 space-y-2">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <input dir="rtl" className={`urdu ${input}`} placeholder="نام (اردو)" value={f.name_urdu} onChange={e => setF({ ...f, name_urdu: e.target.value })} />
        <input className={`font-ltr ${input}`} placeholder="Name (English)" value={f.name_english} onChange={e => setF({ ...f, name_english: e.target.value })} />
        <input className={`font-ltr ${input}`} placeholder="Era" value={f.era} onChange={e => setF({ ...f, era: e.target.value })} />
      </div>
      <textarea dir="rtl" rows={2} className={`urdu ${input}`} placeholder="تعارف" value={f.bio} onChange={e => setF({ ...f, bio: e.target.value })} />
      <Actions busy={busy} err={err} onSave={saveIt} onCancel={() => setEditing(false)} {...(poet ? { onDelete: del } : {})} />
    </div>
  );
}

function BookRow({ book, poets, onDone }: { book?: Book; poets: Poet[]; onDone: () => void }) {
  const [editing, setEditing] = useState(false);
  const [f, setF] = useState({ title_urdu: book?.title_urdu ?? "", title_english: book?.title_english ?? "", poet_id: book?.poet_id ?? "", page_count: book?.page_count != null ? String(book.page_count) : "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const poetName = poets.find(p => p.id === book?.poet_id)?.name_urdu;
  if (!editing) {
    return book ? (
      <div className="flex items-center justify-between gap-2 border-b border-border/50 pb-2">
        <div className="min-w-0">
          <p className="urdu text-base break-words">{book.title_urdu}</p>
          <p className="font-ltr text-xs text-muted-foreground">{[book.title_english, poetName, book.page_count ? `${book.page_count} pages` : null].filter(Boolean).join(" · ")}</p>
        </div>
        <button onClick={() => setEditing(true)} className="p-2 rounded-md hover:bg-accent/50" aria-label="Edit book"><Pencil className="h-4 w-4" /></button>
      </div>
    ) : (
      <button onClick={() => setEditing(true)} className="font-ltr text-xs inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-border hover:bg-accent"><Plus className="h-3.5 w-3.5" /> Add book</button>
    );
  }
  const saveIt = async () => {
    if (!f.title_urdu.trim()) { setErr("Urdu title is required"); return; }
    setBusy(true); setErr("");
    const n = f.page_count.trim() ? parseInt(f.page_count, 10) : null;
    const row = { title_urdu: f.title_urdu.trim(), title_english: f.title_english.trim() || null, poet_id: f.poet_id || null, page_count: Number.isFinite(n as number) ? n : null };
    const { error } = book ? await supabase.from("books").update(row).eq("id", book.id) : await supabase.from("books").insert(row);
    setBusy(false);
    if (error) { setErr(error.message); return; }
    setEditing(false); onDone();
  };
  const del = async () => {
    if (!book || !confirm("Delete this book? Its shair will stay, without a book.")) return;
    setBusy(true);
    await supabase.from("shair").update({ book_id: null }).eq("book_id", book.id);
    const { error } = await supabase.from("books").delete().eq("id", book.id);
    setBusy(false);
    if (error) { setErr(error.message); return; }
    onDone();
  };
  return (
    <div className="border border-border rounded-lg p-3 space-y-2">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <input dir="rtl" className={`urdu ${input}`} placeholder="عنوان (اردو)" value={f.title_urdu} onChange={e => setF({ ...f, title_urdu: e.target.value })} />
        <input className={`font-ltr ${input}`} placeholder="Title (English)" value={f.title_english} onChange={e => setF({ ...f, title_english: e.target.value })} />
        <select dir="rtl" className={`urdu ${input}`} value={f.poet_id} onChange={e => setF({ ...f, poet_id: e.target.value })}>
          <option value="">— شاعر —</option>
          {poets.map(p => <option key={p.id} value={p.id}>{p.name_urdu}</option>)}
        </select>
        <input type="number" className={`font-ltr ${input}`} placeholder="Pages" value={f.page_count} onChange={e => setF({ ...f, page_count: e.target.value })} />
      </div>
      <Actions busy={busy} err={err} onSave={saveIt} onCancel={() => setEditing(false)} {...(book ? { onDelete: del } : {})} />
    </div>
  );
}

function Actions({ busy, err, onSave, onCancel, onDelete }: { busy: boolean; err: string; onSave: () => void; onCancel: () => void; onDelete?: () => void }) {
  return (
    <div>
      {err && <p className="text-destructive text-xs font-ltr mb-2">{err}</p>}
      <div className="flex flex-wrap justify-end gap-2 font-ltr text-xs">
        {onDelete && <button disabled={busy} onClick={onDelete} className="me-auto px-3 py-1.5 rounded-md border border-destructive/40 text-destructive inline-flex items-center gap-1"><Trash2 className="h-3.5 w-3.5" /> Delete</button>}
        <button onClick={onCancel} className="px-3 py-1.5 rounded-md hover:bg-accent inline-flex items-center gap-1"><X className="h-3.5 w-3.5" /> Cancel</button>
        <button disabled={busy} onClick={onSave} className="bg-gold-gradient font-semibold px-3 py-1.5 rounded-md inline-flex items-center gap-1 disabled:opacity-50">
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />} Save
        </button>
      </div>
    </div>
  );
}
