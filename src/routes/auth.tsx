import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { Loader2, Mail } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Sign in — Bait Baazi" }] }),
  component: AuthPage,
});

function AuthPage() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const navigate = useNavigate();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setErr(null);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
      }
      navigate({ to: "/" });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Auth failed");
    } finally { setBusy(false); }
  };

  return (
    <div className="max-w-md mx-auto py-10">
      <div className="card-royal rounded-2xl p-8">
        <h1 className="urdu text-3xl text-gold text-center mb-1">{mode === "signin" ? "لاگ اِن" : "نیا کھاتہ"}</h1>
        <p className="text-center font-ltr text-xs text-muted-foreground mb-6">{mode === "signin" ? "Sign in to continue" : "Create your account"}</p>
        <form onSubmit={submit} className="space-y-3 font-ltr" dir="ltr">
          <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
            placeholder="Email"
            className="w-full rounded-lg bg-input border border-gold/20 px-3 py-2.5 focus:border-gold focus:outline-none" />
          <input type="password" required minLength={8} value={password} onChange={e => setPassword(e.target.value)}
            placeholder="Password (min 8)"
            className="w-full rounded-lg bg-input border border-gold/20 px-3 py-2.5 focus:border-gold focus:outline-none" />
          {err && <p className="text-destructive text-sm">{err}</p>}
          <button disabled={busy} className="w-full bg-gold-gradient rounded-lg py-2.5 font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-50">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
            {mode === "signin" ? "Sign in" : "Sign up"}
          </button>
        </form>
        <button onClick={() => setMode(m => m === "signin" ? "signup" : "signin")}
          className="w-full mt-4 text-center text-sm text-gold-muted hover:text-gold font-ltr">
          {mode === "signin" ? "Need an account? Sign up" : "Have an account? Sign in"}
        </button>
      </div>
    </div>
  );
}
