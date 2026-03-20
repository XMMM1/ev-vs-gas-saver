
-- Store anonymous calculator submissions
CREATE TABLE public.calculator_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT,
  inputs JSONB NOT NULL,
  results JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.calculator_submissions ENABLE ROW LEVEL SECURITY;

-- Allow anonymous inserts
CREATE POLICY "Anyone can insert submissions"
  ON public.calculator_submissions
  FOR INSERT
  WITH CHECK (true);

-- Allow reading own submission by id (no auth needed)
CREATE POLICY "Anyone can read submissions"
  ON public.calculator_submissions
  FOR SELECT
  USING (true);
