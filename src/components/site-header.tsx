import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LogIn, Menu, Sparkles, X } from "lucide-react";

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUserEmail(data.session?.user.email ?? null));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setUserEmail(s?.user.email ?? null));
    return () => data.subscription.unsubscribe();
  }, []);

  const links = [
    { to: "/", label: "صفحۂ اول" },
    { to: "/browse", label: "حروف" },
    { to: "/search", label: "تلاش" },
    { to: "/play", label: "بیت بازی" },
    { to: "/favorites", label: "پسندیدہ" },
    { to: "/admin", label: "ایڈمن" },
  ] as const;

  return (
    <header className="sticky top-0 z-40 border-b border-gold/20 backdrop-blur-md" style={{ background: "oklch(0.11 0.02 300 / 0.85)" }}>
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link to="/" className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-gold" />
          <span className="urdu text-xl text-gold">بیت بازی</span>
          <span className="font-ltr text-xs text-muted-foreground hidden sm:inline">Bait Baazi</span>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {links.map(l => (
            <Link
              key={l.to}
              to={l.to}
              className="urdu px-3 py-1.5 rounded-md text-sm text-foreground/80 hover:text-gold hover:bg-accent/50 transition-colors"
              activeProps={{ className: "urdu px-3 py-1.5 rounded-md text-sm text-gold bg-accent/40" }}
            >{l.label}</Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {userEmail ? (
            <button
              onClick={() => supabase.auth.signOut()}
              className="hidden sm:inline-flex font-ltr text-xs px-3 py-1.5 rounded-md border border-gold/40 text-gold hover:bg-gold/10"
            >Sign out</button>
          ) : (
            <Link to="/auth" className="hidden sm:inline-flex font-ltr text-xs px-3 py-1.5 rounded-md border border-gold/40 text-gold hover:bg-gold/10">
              <LogIn className="h-3.5 w-3.5 me-1" /> Sign in
            </Link>
          )}
          <button className="md:hidden p-2 rounded-md hover:bg-accent" onClick={() => setOpen(v => !v)}>
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>
      {open && (
        <div className="md:hidden border-t border-gold/10 px-4 py-3 space-y-1">
          {links.map(l => (
            <Link key={l.to} to={l.to} onClick={() => setOpen(false)}
              className="urdu block px-3 py-2 rounded-md hover:bg-accent/50">
              {l.label}
            </Link>
          ))}
          {userEmail ? (
            <button onClick={() => { supabase.auth.signOut(); setOpen(false); }} className="font-ltr text-sm mt-2 w-full text-start px-3 py-2 rounded-md hover:bg-accent/50">Sign out</button>
          ) : (
            <Link to="/auth" onClick={() => setOpen(false)} className="font-ltr text-sm mt-2 block px-3 py-2 rounded-md hover:bg-accent/50">Sign in</Link>
          )}
        </div>
      )}
    </header>
  );
}
