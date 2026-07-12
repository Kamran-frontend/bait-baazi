
CREATE POLICY "admins read pdfs" ON storage.objects FOR SELECT
  USING (bucket_id = 'pdfs' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins upload pdfs" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'pdfs' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins delete pdfs" ON storage.objects FOR DELETE
  USING (bucket_id = 'pdfs' AND public.has_role(auth.uid(), 'admin'));
