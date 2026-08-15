import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LogIn, Menu, X } from "lucide-react";
const LOGO_URL = "/logo.png";

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
    { to: "/explore", label: "فلٹر" },
    { to: "/play", label: "بیت بازی" },
    { to: "/practice", label: "مشق" },
    { to: "/favorites", label: "پسندیدہ" },
    { to: "/contact", label: "رابطہ" },
    { to: "/admin", label: "ایڈمن" },
  ] as const;

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-3 sm:px-4 py-2.5 sm:py-3">
        <Link to="/" className="flex items-center gap-2 min-w-0 shrink-0" aria-label="Bait Baazi">
          <img src={LOGO_URL} alt="Bait Baazi" className="h-8 sm:h-10 w-auto" />
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {links.map(l => (
            <Link
              key={l.to}
              to={l.to}
              className="urdu px-3 py-1.5 rounded-md text-foreground/70 hover:text-foreground hover:bg-accent transition-colors"
              activeProps={{ className: "urdu px-3 py-1.5 rounded-md text-foreground bg-accent" }}
            >{l.label}</Link>
          ))}
        </nav>

        <div className="flex items-center gap-2 shrink-0">
          {userEmail ? (
            <button
              onClick={() => supabase.auth.signOut()}
              className="hidden sm:inline-flex font-ltr text-xs px-3 py-1.5 rounded-md border border-border hover:bg-accent"
            >Sign out</button>
          ) : (
            <Link to="/auth" className="hidden sm:inline-flex font-ltr text-xs px-3 py-1.5 rounded-md border border-border hover:bg-accent items-center">
              <LogIn className="h-3.5 w-3.5 me-1" /> Sign in
            </Link>
          )}
          <button className="md:hidden p-2 rounded-md hover:bg-accent" onClick={() => setOpen(v => !v)} aria-label="Menu">
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>
      {open && (
        <div className="md:hidden border-t border-border px-4 py-3 space-y-1">
          {links.map(l => (
            <Link key={l.to} to={l.to} onClick={() => setOpen(false)}
              className="urdu block px-3 py-2 rounded-md hover:bg-accent">
              {l.label}
            </Link>
          ))}
          {userEmail ? (
            <button onClick={() => { supabase.auth.signOut(); setOpen(false); }} className="font-ltr text-sm mt-2 w-full text-start px-3 py-2 rounded-md hover:bg-accent">Sign out</button>
          ) : (
            <Link to="/auth" onClick={() => setOpen(false)} className="font-ltr text-sm mt-2 block px-3 py-2 rounded-md hover:bg-accent">Sign in</Link>
          )}
        </div>
      )}
    </header>
  );
}
