-- Add policy for admins to read all sales_status records
CREATE POLICY "Admins can read all sales status"
ON public.sales_status
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));