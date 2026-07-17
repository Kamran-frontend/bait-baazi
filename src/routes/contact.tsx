import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { submitInquiry } from "@/lib/admin.functions";
import { useState } from "react";
import { Loader2, Mail, Send } from "lucide-react";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact — Bait Baazi" },
      { name: "description", content: "Contact Kamran Ali — questions, feedback and inquiries about the Bait Baazi Urdu poetry app." },
      { property: "og:title", content: "Contact — Bait Baazi" },
      { property: "og:description", content: "Send an inquiry to the Bait Baazi team." },
    ],
  }),
  component: ContactPage,
});

function ContactPage() {
  const submit = useServerFn(submitInquiry);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; msg: string } | null>(null);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <header className="text-center">
        <h1 className="urdu text-2xl sm:text-3xl mb-2">رابطہ کریں</h1>
        <p className="font-ltr text-sm text-muted-foreground">Questions, feedback, or content suggestions — send them across.</p>
      </header>

      <div className="card-royal rounded-2xl p-4 sm:p-6">
        <form onSubmit={async e => {
          e.preventDefault();
          setBusy(true); setStatus(null);
          try {
            await submit({ data: { name, email, subject: subject || undefined, message } });
            setStatus({ ok: true, msg: "Thanks — your message has been sent. Kamran will reply soon." });
            setName(""); setEmail(""); setSubject(""); setMessage("");
          } catch (err) {
            setStatus({ ok: false, msg: err instanceof Error ? err.message : "Could not send message" });
          } finally { setBusy(false); }
        }} className="grid gap-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <input required value={name} onChange={e => setName(e.target.value)} placeholder="Your name" maxLength={100}
              className="font-ltr rounded-lg bg-input border border-border p-2.5 focus:border-foreground focus:outline-none" />
            <input required type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" maxLength={200}
              className="font-ltr rounded-lg bg-input border border-border p-2.5 focus:border-foreground focus:outline-none" />
          </div>
          <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Subject (optional)" maxLength={200}
            className="font-ltr rounded-lg bg-input border border-border p-2.5 focus:border-foreground focus:outline-none" />
          <textarea required rows={6} value={message} onChange={e => setMessage(e.target.value)} placeholder="Your message…" maxLength={3000}
            className="font-ltr rounded-lg bg-input border border-border p-3 focus:border-foreground focus:outline-none" />
          <button disabled={busy} className="justify-self-start bg-foreground text-background rounded-lg px-5 py-2.5 font-ltr font-semibold inline-flex items-center gap-2 disabled:opacity-50">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Send inquiry
          </button>
          {status && (
            <p className={`font-ltr text-sm ${status.ok ? "text-foreground" : "text-destructive"}`}>{status.msg}</p>
          )}
        </form>
      </div>

      <div className="text-center text-sm font-ltr text-muted-foreground">
        Or email directly:{" "}
        <a href="mailto:kamranali130893@gmail.com" className="inline-flex items-center gap-1 underline">
          <Mail className="h-3.5 w-3.5" /> kamranali130893@gmail.com
        </a>
        <div className="mt-2"><Link to="/" className="hover:underline">← Back home</Link></div>
      </div>
    </div>
  );
}
