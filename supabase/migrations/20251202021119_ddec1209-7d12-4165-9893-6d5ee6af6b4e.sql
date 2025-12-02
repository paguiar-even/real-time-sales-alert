-- Create function to update timestamps (must exist before trigger)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create tenants table
CREATE TABLE public.tenants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  logo_url TEXT,
  email_domains TEXT[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on tenants
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- Tenants can be read by authenticated users
CREATE POLICY "Authenticated users can read tenants"
  ON public.tenants FOR SELECT
  TO authenticated
  USING (true);

-- Create user_tenants junction table
CREATE TABLE public.user_tenants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, tenant_id)
);

-- Enable RLS on user_tenants
ALTER TABLE public.user_tenants ENABLE ROW LEVEL SECURITY;

-- Users can only see their own tenant assignments
CREATE POLICY "Users can see their own tenant assignments"
  ON public.user_tenants FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Add tenant_id to sales_status
ALTER TABLE public.sales_status 
ADD COLUMN tenant_id UUID REFERENCES public.tenants(id);

-- Create function to get user's tenant
CREATE OR REPLACE FUNCTION public.get_user_tenant_id(user_uuid UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_email TEXT;
  user_domain TEXT;
  found_tenant_id UUID;
BEGIN
  SELECT email INTO user_email FROM auth.users WHERE id = user_uuid;
  user_domain := split_part(user_email, '@', 2);
  
  -- First check direct assignment
  SELECT tenant_id INTO found_tenant_id 
  FROM public.user_tenants 
  WHERE user_id = user_uuid 
  LIMIT 1;
  
  IF found_tenant_id IS NOT NULL THEN
    RETURN found_tenant_id;
  END IF;
  
  -- Then check by email domain
  SELECT id INTO found_tenant_id 
  FROM public.tenants 
  WHERE user_domain = ANY(email_domains) AND is_active = true
  LIMIT 1;
  
  RETURN found_tenant_id;
END;
$$;

-- Update RLS policy for sales_status
DROP POLICY IF EXISTS "Authenticated users can read" ON public.sales_status;

CREATE POLICY "Users can read their tenant sales data"
  ON public.sales_status FOR SELECT
  TO authenticated
  USING (
    tenant_id IS NULL OR 
    tenant_id = public.get_user_tenant_id(auth.uid())
  );

-- Create storage bucket for tenant logos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('tenant-logos', 'tenant-logos', true);

-- Storage policy for tenant logos
CREATE POLICY "Tenant logos are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'tenant-logos');

-- Create updated_at trigger for tenants
CREATE TRIGGER update_tenants_updated_at
  BEFORE UPDATE ON public.tenants
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();