
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.profiles TO anon;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles readable by all" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "user updates own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "user inserts own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE(user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users see own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TABLE public.poets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_urdu TEXT NOT NULL,
  name_english TEXT,
  era TEXT,
  bio TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(name_urdu)
);
GRANT SELECT ON public.poets TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.poets TO authenticated;
GRANT ALL ON public.poets TO service_role;
ALTER TABLE public.poets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "poets public read" ON public.poets FOR SELECT USING (true);
CREATE POLICY "admins manage poets" ON public.poets FOR ALL
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.books (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title_urdu TEXT NOT NULL,
  title_english TEXT,
  poet_id UUID REFERENCES public.poets(id) ON DELETE SET NULL,
  source_pdf TEXT,
  page_count INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.books TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.books TO authenticated;
GRANT ALL ON public.books TO service_role;
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;
CREATE POLICY "books public read" ON public.books FOR SELECT USING (true);
CREATE POLICY "admins manage books" ON public.books FOR ALL
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.shair (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  text_urdu TEXT NOT NULL,
  poet_id UUID REFERENCES public.poets(id) ON DELETE SET NULL,
  book_id UUID REFERENCES public.books(id) ON DELETE SET NULL,
  page_number INT,
  start_letter TEXT NOT NULL,
  end_letter TEXT NOT NULL,
  keywords TEXT[],
  tags TEXT[],
  category TEXT,
  difficulty INT DEFAULT 3,
  popularity INT DEFAULT 0,
  is_attack BOOLEAN DEFAULT false,
  source TEXT,
  approved BOOLEAN NOT NULL DEFAULT true,
  search_vector TSVECTOR,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.shair TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.shair TO authenticated;
GRANT ALL ON public.shair TO service_role;
ALTER TABLE public.shair ENABLE ROW LEVEL SECURITY;
CREATE POLICY "shair public read" ON public.shair FOR SELECT USING (approved = true);
CREATE POLICY "admins manage shair" ON public.shair FOR ALL
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_shair_start_letter ON public.shair(start_letter) WHERE approved;
CREATE INDEX idx_shair_end_letter ON public.shair(end_letter) WHERE approved;
CREATE INDEX idx_shair_poet ON public.shair(poet_id);
CREATE INDEX idx_shair_book ON public.shair(book_id);
CREATE INDEX idx_shair_search ON public.shair USING GIN(search_vector);
CREATE INDEX idx_shair_text_trgm ON public.shair USING GIN(text_urdu gin_trgm_ops);

CREATE OR REPLACE FUNCTION public.shair_search_trigger()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.search_vector := to_tsvector('simple', COALESCE(NEW.text_urdu, '') || ' ' || COALESCE(array_to_string(NEW.keywords, ' '), ''));
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_shair_search BEFORE INSERT OR UPDATE ON public.shair
  FOR EACH ROW EXECUTE FUNCTION public.shair_search_trigger();

CREATE TABLE public.favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shair_id UUID NOT NULL REFERENCES public.shair(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, shair_id)
);
GRANT SELECT, INSERT, DELETE ON public.favorites TO authenticated;
GRANT ALL ON public.favorites TO service_role;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own favorites" ON public.favorites FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.pdf_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  extracted_count INT DEFAULT 0,
  error_message TEXT,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pdf_uploads TO authenticated;
GRANT ALL ON public.pdf_uploads TO service_role;
ALTER TABLE public.pdf_uploads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins view uploads" ON public.pdf_uploads FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins manage uploads" ON public.pdf_uploads FOR ALL
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
