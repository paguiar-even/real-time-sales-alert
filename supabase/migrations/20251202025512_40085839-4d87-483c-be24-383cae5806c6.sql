-- Add webhook_token column to tenants table
ALTER TABLE public.tenants 
ADD COLUMN webhook_token text UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex');

-- Generate tokens for existing tenants that don't have one
UPDATE public.tenants 
SET webhook_token = encode(gen_random_bytes(32), 'hex') 
WHERE webhook_token IS NULL;