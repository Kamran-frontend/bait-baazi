
CREATE TABLE public.shair_flags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shair_id UUID NOT NULL REFERENCES public.shair(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (shair_id, user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.shair_flags TO authenticated;
GRANT ALL ON public.shair_flags TO service_role;

ALTER TABLE public.shair_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users create own flags" ON public.shair_flags
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users see own flags" ON public.shair_flags
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "users delete own flags" ON public.shair_flags
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "admins view all flags" ON public.shair_flags
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins update all flags" ON public.shair_flags
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins delete all flags" ON public.shair_flags
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX shair_flags_status_idx ON public.shair_flags(status);
CREATE INDEX shair_flags_shair_idx ON public.shair_flags(shair_id);
