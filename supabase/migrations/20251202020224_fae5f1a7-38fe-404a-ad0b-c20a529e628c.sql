-- Remove public RLS policies
DROP POLICY IF EXISTS "Allow public insert" ON public.sales_status;
DROP POLICY IF EXISTS "Allow public read access" ON public.sales_status;

-- Create authenticated-only policies
CREATE POLICY "Authenticated users can read"
  ON public.sales_status FOR SELECT
  TO authenticated
  USING (true);

-- Note: INSERT is handled by edge function using service role key (bypasses RLS)