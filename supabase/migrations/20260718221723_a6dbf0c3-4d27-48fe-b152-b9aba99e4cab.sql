ALTER TABLE public.shair ADD COLUMN IF NOT EXISTS serial BIGSERIAL;
CREATE UNIQUE INDEX IF NOT EXISTS shair_serial_key ON public.shair(serial);