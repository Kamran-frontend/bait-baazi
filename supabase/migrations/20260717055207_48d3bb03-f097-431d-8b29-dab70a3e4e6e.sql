
CREATE TABLE public.inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT,
  message TEXT NOT NULL,
  user_id UUID,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.inquiries TO authenticated;
GRANT INSERT ON public.inquiries TO anon;
GRANT ALL ON public.inquiries TO service_role;

ALTER TABLE public.inquiries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit inquiry" ON public.inquiries
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Admins can view inquiries" ON public.inquiries
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update inquiries" ON public.inquiries
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete inquiries" ON public.inquiries
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Seed sole admin
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role FROM auth.users WHERE lower(email) = 'kamranali130893@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- Remove any other admins (single-admin policy)
DELETE FROM public.user_roles
WHERE role = 'admin'
  AND user_id NOT IN (SELECT id FROM auth.users WHERE lower(email) = 'kamranali130893@gmail.com');

-- Auto-grant admin to that email on new signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
  IF lower(NEW.email) = 'kamranali130893@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;
