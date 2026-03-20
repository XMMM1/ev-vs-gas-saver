
CREATE TABLE public.pdf_downloads (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  submission_id uuid NOT NULL REFERENCES public.calculator_submissions(id) ON DELETE CASCADE,
  email text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.pdf_downloads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert pdf downloads"
  ON public.pdf_downloads FOR INSERT
  WITH CHECK (true);
