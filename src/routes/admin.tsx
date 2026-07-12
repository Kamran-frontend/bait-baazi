import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { claimAdmin, myRole, addShair, extractShairFromText, deleteShair } from "@/lib/admin.functions";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Shield, Sparkles, Trash2 } from "lucide-react";

export const Route = createFileRoute("/admin")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
  },
  head: () => ({ meta: [{ title: "Admin — Bait Baazi" }] }),
  component: AdminPage,
});

function AdminPage() {
  const askRole = useServerFn(myRole);
  const askClaim = useServerFn(claimAdmin);
  const addFn = useServerFn(addShair);
  const extractFn = useServerFn(extractShairFromText);
  const delFn = useServerFn(deleteShair);
  const qc = useQueryClient();

  const [role, setRole] = useState<string[] | null>(null);
  const [claimStatus, setClaimStatus] = useState<string>("");

  const [manualText, setManualText] = useState("");
  const [manualPoet, setManualPoet] = useState("");
  const [manualBook, setManualBook] = useState("");
  const [manualStatus, setManualStatus] = useState<string>("");

  const [batchText, setBatchText] = useState("");
  const [batchPoet, setBatchPoet] = useState("");
  const [batchBook, setBatchBook] = useState("");
  const [batchBusy, setBatchBusy] = useState(false);
  const [batchResult, setBatchResult] = useState<string>("");

  useEffect(() => { askRole().then(r => setRole(r.roles)).catch(() => setRole([])); }, [askRole]);
  const isAdmin = role?.includes("admin") ?? false;

  const recent = useQuery({
    queryKey: ["admin", "recent-shair"],
    queryFn: async () => {
      const { data } = await supabase.from("shair").select("id, text_urdu, start_letter, end_letter, source, created_at").order("created_at", { ascending: false }).limit(30);
      return data ?? [];
    },
    enabled: isAdmin,
  });

  if (role === null) return <div className="text-center py-20"><Loader2 className="h-6 w-6 animate-spin mx-auto text-gold" /></div>;

  if (!isAdmin) {
    return (
      <div className="max-w-md mx-auto card-royal rounded-2xl p-8 text-center">
        <Shield className="h-10 w-10 text-gold mx-auto mb-3" />
        <h2 className="urdu text-2xl text-gold mb-2">ایڈمن اکاؤنٹ</h2>
        <p className="font-ltr text-sm text-muted-foreground mb-4">You are signed in but not an admin. Claim admin (first user only):</p>
        <button
          onClick={async () => {
            try { const r = await askClaim(); setClaimStatus(r.alreadyAdmin ? "Already admin" : "Admin granted!"); const rr = await askRole(); setRole(rr.roles); }
            catch (e) { setClaimStatus(e instanceof Error ? e.message : "Failed"); }
          }}
          className="bg-gold-gradient rounded-lg px-5 py-2.5 font-ltr font-semibold">Claim admin</button>
        {claimStatus && <p className="mt-3 text-sm font-ltr">{claimStatus}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="text-center">
        <h1 className="urdu text-3xl text-gold">ایڈمن پینل</h1>
        <p className="font-ltr text-sm text-muted-foreground">Manage the poetry library</p>
      </header>

      {/* Manual add */}
      <section className="card-royal rounded-2xl p-6">
        <h2 className="urdu text-xl text-gold mb-3">شعر شامل کریں</h2>
        <div className="grid gap-3">
          <textarea rows={3} dir="rtl" value={manualText} onChange={e => setManualText(e.target.value)}
            placeholder="مکمل شعر (دو مصرعے) لکھیں…"
            className="urdu text-xl rounded-lg bg-input border border-gold/20 p-3 focus:border-gold focus:outline-none" />
          <div className="grid grid-cols-2 gap-3">
            <input dir="rtl" value={manualPoet} onChange={e => setManualPoet(e.target.value)} placeholder="شاعر (اختیاری)"
              className="urdu rounded-lg bg-input border border-gold/20 p-2.5 focus:border-gold focus:outline-none" />
            <input dir="rtl" value={manualBook} onChange={e => setManualBook(e.target.value)} placeholder="کتاب (اختیاری)"
              className="urdu rounded-lg bg-input border border-gold/20 p-2.5 focus:border-gold focus:outline-none" />
          </div>
          <button
            onClick={async () => {
              try {
                const r = await addFn({ data: { text_urdu: manualText, poet_name: manualPoet, book_title: manualBook } });
                setManualStatus(`Added — ${r.start} → ${r.end}`); setManualText(""); qc.invalidateQueries();
              } catch (e) { setManualStatus(e instanceof Error ? e.message : "Failed"); }
            }}
            className="bg-gold-gradient rounded-lg px-5 py-2.5 font-ltr font-semibold w-full sm:w-auto">Add shair</button>
          {manualStatus && <p className="font-ltr text-sm">{manualStatus}</p>}
        </div>
      </section>

      {/* AI extraction */}
      <section className="card-royal rounded-2xl p-6">
        <h2 className="urdu text-xl text-gold mb-1">AI سے اشعار نکالیں</h2>
        <p className="font-ltr text-sm text-muted-foreground mb-3">Paste raw Urdu text (copied from a PDF, book, or web page). AI will identify each shair, compute start/end letters, and add them.</p>
        <div className="grid gap-3">
          <textarea rows={10} dir="rtl" value={batchText} onChange={e => setBatchText(e.target.value)}
            placeholder="Urdu text yahan paste karein…"
            className="urdu rounded-lg bg-input border border-gold/20 p-3 focus:border-gold focus:outline-none" />
          <div className="grid grid-cols-2 gap-3">
            <input dir="rtl" value={batchPoet} onChange={e => setBatchPoet(e.target.value)} placeholder="شاعر (اختیاری)"
              className="urdu rounded-lg bg-input border border-gold/20 p-2.5 focus:border-gold focus:outline-none" />
            <input dir="rtl" value={batchBook} onChange={e => setBatchBook(e.target.value)} placeholder="کتاب (اختیاری)"
              className="urdu rounded-lg bg-input border border-gold/20 p-2.5 focus:border-gold focus:outline-none" />
          </div>
          <button disabled={batchBusy}
            onClick={async () => {
              setBatchBusy(true); setBatchResult("");
              try {
                const r = await extractFn({ data: { text: batchText, poet_name: batchPoet, book_title: batchBook, source: "ai-paste" } });
                setBatchResult(`Inserted ${r.inserted} shair${r.duplicates ? ` (${r.duplicates} duplicates skipped)` : ""}.`);
                setBatchText(""); qc.invalidateQueries();
              } catch (e) { setBatchResult(e instanceof Error ? e.message : "Failed"); }
              finally { setBatchBusy(false); }
            }}
            className="bg-gold-gradient rounded-lg px-5 py-2.5 font-ltr font-semibold w-full sm:w-auto inline-flex items-center gap-2 disabled:opacity-50">
            {batchBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Extract with AI
          </button>
          {batchResult && <p className="font-ltr text-sm">{batchResult}</p>}
        </div>
      </section>

      {/* Recent */}
      <section className="card-royal rounded-2xl p-6">
        <h2 className="urdu text-xl text-gold mb-3">تازہ اشعار</h2>
        <div className="space-y-2">
          {(recent.data ?? []).map(s => (
            <div key={s.id} className="flex items-start justify-between gap-3 border-b border-border/50 pb-2">
              <div>
                <p className="urdu urdu-lg">{s.text_urdu}</p>
                <p className="font-ltr text-xs text-muted-foreground">{s.start_letter} → {s.end_letter} · {s.source}</p>
              </div>
              <button
                onClick={async () => { await delFn({ data: { id: s.id } }); qc.invalidateQueries(); }}
                className="p-2 rounded-md hover:bg-destructive/20 text-destructive"><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
          {!recent.data?.length && <p className="text-muted-foreground text-sm">No shair yet.</p>}
        </div>
        <div className="mt-4 text-center">
          <Link to="/" className="font-ltr text-xs text-gold-muted hover:text-gold">← Back home</Link>
        </div>
      </section>
    </div>
  );
}
