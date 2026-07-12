
DROP POLICY IF EXISTS "admins manage poets" ON public.poets;
DROP POLICY IF EXISTS "admins manage books" ON public.books;
DROP POLICY IF EXISTS "admins manage shair" ON public.shair;
DROP POLICY IF EXISTS "admins view uploads" ON public.pdf_uploads;
DROP POLICY IF EXISTS "admins manage uploads" ON public.pdf_uploads;

CREATE POLICY "admins manage poets" ON public.poets FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins manage books" ON public.books FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins manage shair" ON public.shair FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins view uploads" ON public.pdf_uploads FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins manage uploads" ON public.pdf_uploads FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- storage policies too
DROP POLICY IF EXISTS "admins read pdfs" ON storage.objects;
DROP POLICY IF EXISTS "admins upload pdfs" ON storage.objects;
DROP POLICY IF EXISTS "admins delete pdfs" ON storage.objects;
CREATE POLICY "admins read pdfs" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'pdfs' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins upload pdfs" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'pdfs' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins delete pdfs" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'pdfs' AND public.has_role(auth.uid(), 'admin'));
