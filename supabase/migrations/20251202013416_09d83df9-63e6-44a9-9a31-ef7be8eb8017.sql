-- Create sales_status table for storing real-time sales data
CREATE TABLE public.sales_status (
  id BIGSERIAL PRIMARY KEY,
  vendas_minuto INTEGER NOT NULL DEFAULT 0,
  vendas_status TEXT NOT NULL CHECK (vendas_status IN ('OK', 'ALERTA_ZERO')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.sales_status ENABLE ROW LEVEL SECURITY;

-- Create policy to allow public read access (for the monitor page)
CREATE POLICY "Allow public read access" 
ON public.sales_status 
FOR SELECT 
USING (true);

-- Create policy to allow public insert (for the webhook)
CREATE POLICY "Allow public insert" 
ON public.sales_status 
FOR INSERT 
WITH CHECK (true);

-- Create index for faster queries on created_at
CREATE INDEX idx_sales_status_created_at ON public.sales_status(created_at DESC);

-- Enable realtime for the table
ALTER PUBLICATION supabase_realtime ADD TABLE public.sales_status;