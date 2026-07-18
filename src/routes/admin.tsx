import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  myRole, addShair, editShair, extractShairFromText,
  deleteShair, extractShairFromImages, reclassifyAllShair,
  listOpenFlags, resolveFlag,
  listUsers, setUserRole, setUserBanned, deleteUser,
  listInquiries, setInquiryStatus,
} from "@/lib/admin.functions";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Ban, CheckCircle2, Flag, ImagePlus, Inbox, Loader2, Mail, Pencil, RefreshCw, Shield, ShieldCheck, Sparkles, Trash2, UserX, X } from "lucide-react";
import { Pagination, usePaged } from "@/components/pagination";

export const Route = createFileRoute("/admin")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
  },
  head: () => ({ meta: [{ title: "Admin — Bait Baazi" }] }),
  component: AdminPage,
});

type ShairRow = { id: string; serial: number | null; text_urdu: string; start_letter: string; end_letter: string; source: string | null; created_at: string; poet_id?: string | null; book_id?: string | null };

function AdminPage() {
  const askRole = useServerFn(myRole);
  const addFn = useServerFn(addShair);
  const editFn = useServerFn(editShair);
  const extractFn = useServerFn(extractShairFromText);
  const delFn = useServerFn(deleteShair);
  const imgFn = useServerFn(extractShairFromImages);
  const reclassFn = useServerFn(reclassifyAllShair);
  const listFlagsFn = useServerFn(listOpenFlags);
  const resolveFn = useServerFn(resolveFlag);
  const listUsersFn = useServerFn(listUsers);
  const setRoleFn = useServerFn(setUserRole);
  const setBannedFn = useServerFn(setUserBanned);
  const deleteUserFn = useServerFn(deleteUser);
  const listInquiriesFn = useServerFn(listInquiries);
  const setInquiryFn = useServerFn(setInquiryStatus);
  const qc = useQueryClient();

  const [role, setRole] = useState<string[] | null>(null);

  const [manualText, setManualText] = useState("");
  const [manualPoet, setManualPoet] = useState("");
  const [manualBook, setManualBook] = useState("");
  const [manualStatus, setManualStatus] = useState<string>("");

  const [batchText, setBatchText] = useState("");
  const [batchPoet, setBatchPoet] = useState("");
  const [batchBook, setBatchBook] = useState("");
  const [batchBusy, setBatchBusy] = useState(false);
  const [batchResult, setBatchResult] = useState<string>("");

  const [imgPoet, setImgPoet] = useState("");
  const [imgBook, setImgBook] = useState("");
  const [imgBusy, setImgBusy] = useState(false);
  const [imgStatus, setImgStatus] = useState<string>("");
  const [imgFiles, setImgFiles] = useState<File[]>([]);

  const [reclassBusy, setReclassBusy] = useState(false);
  const [reclassResult, setReclassResult] = useState<string>("");

  const [edit, setEdit] = useState<ShairRow | null>(null);

  useEffect(() => { askRole().then(r => setRole(r.roles)).catch(() => setRole([])); }, [askRole]);
  const isAdmin = role?.includes("admin") ?? false;

  const recent = useQuery({
    queryKey: ["admin", "recent-shair"],
    queryFn: async () => {
      const { data } = await supabase.from("shair").select("id, serial, text_urdu, start_letter, end_letter, source, created_at, poet_id, book_id").order("serial", { ascending: false }).limit(500);
      return (data ?? []) as ShairRow[];
    },
    enabled: isAdmin,
  });
  const [recentPage, setRecentPage] = useState(1);

  const flags = useQuery({
    queryKey: ["admin", "flags"],
    queryFn: () => listFlagsFn(),
    enabled: isAdmin,
  });

  const users = useQuery({
    queryKey: ["admin", "users"],
    queryFn: () => listUsersFn(),
    enabled: isAdmin,
  });

  const inquiries = useQuery({
    queryKey: ["admin", "inquiries"],
    queryFn: () => listInquiriesFn(),
    enabled: isAdmin,
  });

  if (role === null) return <div className="text-center py-20"><Loader2 className="h-6 w-6 animate-spin mx-auto text-gold" /></div>;

  if (!isAdmin) {
    return (
      <div className="max-w-md mx-auto card-royal rounded-2xl p-6 sm:p-8 text-center">
        <Shield className="h-10 w-10 text-gold mx-auto mb-3" />
        <h2 className="urdu text-2xl text-gold mb-2">رسائی مسدود</h2>
        <p className="font-ltr text-sm text-muted-foreground">This area is restricted to the site owner.</p>
      </div>
    );
  }

  const readFileAsBase64 = (file: File) => new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      const s = String(r.result ?? "");
      const idx = s.indexOf(",");
      resolve(idx >= 0 ? s.slice(idx + 1) : s);
    };
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });

  return (
    <div className="space-y-6 sm:space-y-8">
      <header className="text-center">
        <h1 className="urdu text-2xl sm:text-3xl text-gold">ایڈمن پینل</h1>
        <p className="font-ltr text-sm text-muted-foreground">Manage the poetry library</p>
      </header>

      {/* Image / screenshot extraction (AI + OCR) */}
      <section className="card-royal rounded-2xl p-4 sm:p-6">
        <div className="flex items-start gap-3 mb-3">
          <ImagePlus className="h-5 w-5 shrink-0 mt-0.5" />
          <div className="min-w-0">
            <h2 className="urdu text-lg sm:text-xl">تصویر یا اسکرین شاٹ سے اشعار</h2>
            <p className="font-ltr text-xs sm:text-sm text-muted-foreground">Upload photos of book pages, or paste a screenshot (Ctrl/Cmd + V). AI reads every image and extracts each shair — preserves diacritics, distinguishes ں / ن and ے / ی.</p>
          </div>
        </div>
        <div className="grid gap-3">
          <div
            onPaste={e => {
              const files: File[] = [];
              for (const item of Array.from(e.clipboardData.items)) {
                if (item.type.startsWith("image/")) {
                  const f = item.getAsFile(); if (f) files.push(f);
                }
              }
              if (files.length) setImgFiles(prev => [...prev, ...files]);
            }}
            className="rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted-foreground focus:outline-none focus:border-foreground"
            tabIndex={0}
          >
            Paste a screenshot here (Ctrl/Cmd + V) or choose files below
          </div>
          <input
            type="file" accept="image/*" multiple
            onChange={e => setImgFiles(Array.from(e.target.files ?? []))}
            className="font-ltr text-sm file:me-3 file:px-3 file:py-2 file:rounded-md file:border-0 file:bg-gold-gradient file:font-semibold file:cursor-pointer"
          />
          {imgFiles.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {imgFiles.map((f, i) => (
                <div key={i} className="relative">
                  <img src={URL.createObjectURL(f)} alt="" className="h-20 w-20 object-cover rounded-md border border-border" />
                  <button onClick={() => setImgFiles(prev => prev.filter((_, j) => j !== i))}
                    className="absolute -top-2 -right-2 bg-foreground text-background rounded-full p-0.5" aria-label="Remove">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input dir="rtl" value={imgPoet} onChange={e => setImgPoet(e.target.value)} placeholder="شاعر (اختیاری)"
              className="urdu rounded-lg bg-input border border-border p-2.5 focus:border-foreground focus:outline-none" />
            <input dir="rtl" value={imgBook} onChange={e => setImgBook(e.target.value)} placeholder="کتاب (اختیاری)"
              className="urdu rounded-lg bg-input border border-border p-2.5 focus:border-foreground focus:outline-none" />
          </div>
          <button
            disabled={imgFiles.length === 0 || imgBusy}
            onClick={async () => {
              if (imgFiles.length === 0) return;
              setImgBusy(true); setImgStatus("Reading images…");
              try {
                const images = await Promise.all(imgFiles.map(async f => ({
                  mime: f.type || "image/png",
                  base64: await readFileAsBase64(f),
                })));
                setImgStatus("Sending to AI — this may take a moment…");
                const r = await imgFn({ data: { images, poet_name: imgPoet, book_title: imgBook } });
                setImgStatus(`✅ Extracted ${r.inserted} shair (${r.duplicates} duplicates skipped).`);
                setImgFiles([]); qc.invalidateQueries();
              } catch (e) {
                setImgStatus(`❌ ${e instanceof Error ? e.message : "Failed"}`);
              } finally { setImgBusy(false); }
            }}
            className="bg-gold-gradient rounded-lg px-5 py-2.5 font-ltr font-semibold inline-flex items-center gap-2 disabled:opacity-50 w-full sm:w-auto">
            {imgBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
            Extract shair
          </button>
          {imgStatus && <p className="font-ltr text-sm break-words">{imgStatus}</p>}
        </div>
      </section>


      {/* Manual add */}
      <section className="card-royal rounded-2xl p-4 sm:p-6">
        <h2 className="urdu text-lg sm:text-xl text-gold mb-3">شعر شامل کریں</h2>
        <div className="grid gap-3">
          <textarea rows={3} dir="rtl" value={manualText} onChange={e => setManualText(e.target.value)}
            placeholder="مکمل شعر (دو مصرعے) لکھیں — زیر زبر پیش سب محفوظ رہیں گے…"
            className="urdu text-lg sm:text-xl rounded-lg bg-input border border-gold/20 p-3 focus:border-gold focus:outline-none" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

      {/* Paste text extraction */}
      <section className="card-royal rounded-2xl p-4 sm:p-6">
        <h2 className="urdu text-lg sm:text-xl text-gold mb-1">متن سے AI اشعار نکالیں</h2>
        <p className="font-ltr text-xs sm:text-sm text-muted-foreground mb-3">Paste raw Urdu / Arabic / Farsi text. AI splits it into individual shair.</p>
        <div className="grid gap-3">
          <textarea rows={8} dir="rtl" value={batchText} onChange={e => setBatchText(e.target.value)}
            placeholder="Urdu text yahan paste karein…"
            className="urdu rounded-lg bg-input border border-gold/20 p-3 focus:border-gold focus:outline-none" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

      {/* Maintenance */}
      <section className="card-royal rounded-2xl p-4 sm:p-6">
        <h2 className="urdu text-lg sm:text-xl text-gold mb-2">دیکھ بھال</h2>
        <p className="font-ltr text-xs text-muted-foreground mb-3">Recompute every shair's start and end letters using the latest Urdu logic.</p>
        <button disabled={reclassBusy} onClick={async () => {
          setReclassBusy(true); setReclassResult("");
          try {
            const r = await reclassFn();
            setReclassResult(`Updated ${r.updated} shair${r.failed ? `, ${r.failed} failed` : ""}.`);
            qc.invalidateQueries();
          } catch (e) { setReclassResult(e instanceof Error ? e.message : "Failed"); }
          finally { setReclassBusy(false); }
        }} className="border border-gold/40 text-gold rounded-lg px-4 py-2 font-ltr text-sm inline-flex items-center gap-2 disabled:opacity-50">
          {reclassBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Reclassify all shair
        </button>
        {reclassResult && <p className="font-ltr text-sm mt-2">{reclassResult}</p>}
      </section>

      {/* Flagged */}
      <section className="card-royal rounded-2xl p-4 sm:p-6">
        <h2 className="urdu text-lg sm:text-xl text-gold mb-3 inline-flex items-center gap-2"><Flag className="h-4 w-4" /> رپورٹ شدہ اشعار</h2>
        {flags.isLoading ? <Loader2 className="h-4 w-4 animate-spin text-gold" /> : (flags.data ?? []).length === 0 ? (
          <p className="text-muted-foreground text-sm font-ltr">No open flags.</p>
        ) : (
          <div className="space-y-3">
            {(flags.data ?? []).map((f: any) => (
              <div key={f.id} className="border border-border/60 rounded-lg p-3">
                <p className="urdu text-lg text-parchment whitespace-pre-line break-words">{f.shair?.text_urdu}</p>
                <p className="font-ltr text-xs text-muted-foreground mt-1">{f.shair?.start_letter} → {f.shair?.end_letter}</p>
                {f.reason && <p className="urdu text-sm mt-2 text-destructive/90 break-words">وجہ: {f.reason}</p>}
                <div className="mt-2 flex flex-wrap gap-2">
                  <button onClick={async () => { await resolveFn({ data: { id: f.id, action: "dismiss" } }); flags.refetch(); }}
                    className="font-ltr text-xs px-3 py-1.5 rounded-md border border-gold/40 text-gold inline-flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Dismiss
                  </button>
                  <button onClick={async () => { await resolveFn({ data: { id: f.id, action: "delete_shair", shair_id: f.shair?.id } }); flags.refetch(); qc.invalidateQueries(); }}
                    className="font-ltr text-xs px-3 py-1.5 rounded-md bg-destructive/80 text-destructive-foreground inline-flex items-center gap-1">
                    <Trash2 className="h-3.5 w-3.5" /> Delete shair
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Inquiries */}
      <section className="card-royal rounded-2xl p-4 sm:p-6">
        <h2 className="urdu text-lg sm:text-xl mb-3 inline-flex items-center gap-2"><Inbox className="h-4 w-4" /> رابطہ پیغامات</h2>
        {inquiries.isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : (inquiries.data ?? []).length === 0 ? (
          <p className="text-muted-foreground text-sm font-ltr">No inquiries yet.</p>
        ) : (
          <div className="space-y-3">
            {(inquiries.data ?? []).map((i: any) => (
              <div key={i.id} className={`border rounded-lg p-3 ${i.status === "resolved" ? "border-border/40 opacity-60" : "border-border"}`}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="font-ltr text-sm">
                    <span className="font-semibold">{i.name}</span>
                    <a href={`mailto:${i.email}`} className="ms-2 text-muted-foreground hover:text-foreground">&lt;{i.email}&gt;</a>
                  </div>
                  <div className="font-ltr text-[11px] text-muted-foreground">{new Date(i.created_at).toLocaleString()}</div>
                </div>
                {i.subject && <p className="font-ltr text-sm font-medium mt-1">{i.subject}</p>}
                <p className="font-ltr text-sm mt-1 whitespace-pre-line break-words">{i.message}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    onClick={async () => { await setInquiryFn({ data: { id: i.id, status: i.status === "resolved" ? "open" : "resolved" } }); inquiries.refetch(); }}
                    className="font-ltr text-xs px-3 py-1.5 rounded-md border border-border inline-flex items-center gap-1 hover:bg-accent">
                    <CheckCircle2 className="h-3.5 w-3.5" /> {i.status === "resolved" ? "Reopen" : "Mark resolved"}
                  </button>
                  <a href={`mailto:${i.email}?subject=Re: ${encodeURIComponent(i.subject ?? "Your inquiry")}`}
                    className="font-ltr text-xs px-3 py-1.5 rounded-md border border-border inline-flex items-center gap-1 hover:bg-accent">
                    <Mail className="h-3.5 w-3.5" /> Reply
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>


      <section className="card-royal rounded-2xl p-4 sm:p-6">
        <h2 className="urdu text-lg sm:text-xl mb-3 inline-flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> صارفین</h2>
        {users.isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : (
          <div className="overflow-x-auto -mx-2 sm:mx-0">
            <table className="w-full min-w-[560px] text-sm font-ltr">
              <thead>
                <tr className="text-start text-xs text-muted-foreground border-b border-border">
                  <th className="text-start py-2 px-2">Email</th>
                  <th className="text-start py-2 px-2">Roles</th>
                  <th className="text-start py-2 px-2">Last sign-in</th>
                  <th className="text-start py-2 px-2">Favs</th>
                  <th className="text-end py-2 px-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(users.data ?? []).map(u => {
                  const isAdminU = u.roles.includes("admin");
                  const isBanned = !!u.banned_until && new Date(u.banned_until).getTime() > Date.now();
                  return (
                    <tr key={u.id} className="border-b border-border/50">
                      <td className="py-2 px-2 break-all">
                        {u.email ?? <span className="text-muted-foreground">—</span>}
                        {isBanned && <span className="ms-2 text-[10px] px-1.5 py-0.5 rounded-full bg-destructive/15 text-destructive">banned</span>}
                      </td>
                      <td className="py-2 px-2">
                        {u.roles.length ? u.roles.map(r => (
                          <span key={r} className="me-1 text-[10px] px-1.5 py-0.5 rounded-full bg-accent">{r}</span>
                        )) : <span className="text-muted-foreground text-xs">user</span>}
                      </td>
                      <td className="py-2 px-2 text-xs text-muted-foreground">
                        {u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleDateString() : "—"}
                      </td>
                      <td className="py-2 px-2">{u.favorite_count}</td>
                      <td className="py-2 px-2 text-end">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={async () => { await setRoleFn({ data: { user_id: u.id, role: "admin", grant: !isAdminU } }); users.refetch(); }}
                            className={`text-[11px] px-2 py-1 rounded-md border border-border inline-flex items-center gap-1 hover:bg-accent`}
                            title={isAdminU ? "Revoke admin" : "Grant admin"}
                          >
                            <ShieldCheck className="h-3 w-3" /> {isAdminU ? "Revoke" : "Admin"}
                          </button>
                          <button
                            onClick={async () => { await setBannedFn({ data: { user_id: u.id, banned: !isBanned } }); users.refetch(); }}
                            className="text-[11px] px-2 py-1 rounded-md border border-border inline-flex items-center gap-1 hover:bg-accent"
                            title={isBanned ? "Unban" : "Ban"}
                          >
                            <Ban className="h-3 w-3" /> {isBanned ? "Unban" : "Ban"}
                          </button>
                          <button
                            onClick={async () => {
                              if (!confirm(`Permanently delete ${u.email ?? "this user"}?`)) return;
                              await deleteUserFn({ data: { user_id: u.id } }); users.refetch();
                            }}
                            className="text-[11px] px-2 py-1 rounded-md border border-destructive/40 text-destructive inline-flex items-center gap-1 hover:bg-destructive/10"
                            title="Delete user"
                          >
                            <UserX className="h-3 w-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Recent */}
      <RecentShairSection recent={recent.data ?? []} page={recentPage} setPage={setRecentPage} onEdit={setEdit} onDelete={async (id) => {
        if (!confirm("Delete this shair?")) return;
        await delFn({ data: { id } }); qc.invalidateQueries();
      }} />

      {edit && <EditModal row={edit} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); qc.invalidateQueries(); }} save={editFn} />}
    </div>
  );
}

function RecentShairSection({ recent, page, setPage, onEdit, onDelete }: {
  recent: ShairRow[]; page: number; setPage: (p: number) => void;
  onEdit: (r: ShairRow) => void; onDelete: (id: string) => void;
}) {
  const paged = usePaged<ShairRow>(recent, page);
  return (
    <section className="card-royal rounded-2xl p-4 sm:p-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="urdu text-lg sm:text-xl text-gold">تمام اشعار</h2>
        <span className="font-ltr text-xs text-muted-foreground">{recent.length} total</span>
      </div>
      <div className="space-y-2">
        {paged.slice.map((s) => (
          <div key={s.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2 border-b border-border/50 pb-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                {s.serial != null && <span className="font-ltr text-[10px] px-1.5 py-0.5 rounded-md border border-border text-muted-foreground">#{s.serial}</span>}
                <span className="font-ltr text-[11px] text-muted-foreground">{s.start_letter} → {s.end_letter} · {s.source}</span>
              </div>
              <p className="urdu text-base sm:text-lg break-words whitespace-pre-line">{s.text_urdu}</p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button onClick={() => onEdit(s)} className="p-2 rounded-md hover:bg-accent/50 text-gold" aria-label="Edit"><Pencil className="h-4 w-4" /></button>
              <button onClick={() => onDelete(s.id)} className="p-2 rounded-md hover:bg-destructive/20 text-destructive" aria-label="Delete"><Trash2 className="h-4 w-4" /></button>
            </div>
          </div>
        ))}
        {!recent.length && <p className="text-muted-foreground text-sm">No shair yet.</p>}
      </div>
      <Pagination page={paged.page} totalPages={paged.totalPages} onChange={setPage} />
      <div className="mt-4 text-center">
        <Link to="/" className="font-ltr text-xs text-gold-muted hover:text-gold">← Back home</Link>
      </div>
    </section>
  );
}

function EditModal({ row, onClose, onSaved, save }: {
  row: ShairRow; onClose: () => void; onSaved: () => void;
  save: (args: { data: { id: string; text_urdu: string; poet_name?: string; book_title?: string; page_number?: number | null } }) => Promise<unknown>;
}) {
  const [text, setText] = useState(row.text_urdu);
  const [poet, setPoet] = useState("");
  const [book, setBook] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string>("");
  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-3 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="card-royal rounded-2xl w-full max-w-lg p-4 sm:p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="urdu text-lg text-gold">شعر ترمیم کریں</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-accent/50"><X className="h-4 w-4" /></button>
        </div>
        <textarea rows={4} dir="rtl" value={text} onChange={e => setText(e.target.value)}
          className="urdu text-lg w-full rounded-lg bg-input border border-gold/20 p-3 focus:border-gold focus:outline-none" />
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input dir="rtl" value={poet} onChange={e => setPoet(e.target.value)} placeholder="شاعر (اپڈیٹ کریں)"
            className="urdu rounded-lg bg-input border border-gold/20 p-2.5 focus:border-gold focus:outline-none" />
          <input dir="rtl" value={book} onChange={e => setBook(e.target.value)} placeholder="کتاب (اپڈیٹ کریں)"
            className="urdu rounded-lg bg-input border border-gold/20 p-2.5 focus:border-gold focus:outline-none" />
        </div>
        {err && <p className="text-destructive text-sm font-ltr mt-2">{err}</p>}
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="font-ltr text-sm px-4 py-2 rounded-md text-muted-foreground hover:bg-accent/50">Cancel</button>
          <button disabled={busy} onClick={async () => {
            setBusy(true); setErr("");
            try { await save({ data: { id: row.id, text_urdu: text, poet_name: poet, book_title: book } }); onSaved(); }
            catch (e) { setErr(e instanceof Error ? e.message : "Failed"); }
            finally { setBusy(false); }
          }} className="bg-gold-gradient font-ltr text-sm font-semibold px-4 py-2 rounded-md inline-flex items-center gap-2 disabled:opacity-50">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} Save
          </button>
        </div>
      </div>
    </div>
  );
}
