CREATE POLICY "Anyone can update submissions"
ON public.calculator_submissions
FOR UPDATE
USING (true)
WITH CHECK (true);