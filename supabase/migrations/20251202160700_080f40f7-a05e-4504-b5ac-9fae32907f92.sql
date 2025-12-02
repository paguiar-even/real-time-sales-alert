-- Fix RLS policies for tenants table - change from RESTRICTIVE to PERMISSIVE

-- Drop existing policies
DROP POLICY IF EXISTS "Admins can insert tenants" ON public.tenants;
DROP POLICY IF EXISTS "Admins can update tenants" ON public.tenants;
DROP POLICY IF EXISTS "Admins can delete tenants" ON public.tenants;
DROP POLICY IF EXISTS "Users can read their own tenant" ON public.tenants;

-- Recreate policies as PERMISSIVE (default)
CREATE POLICY "Admins can insert tenants" 
ON public.tenants 
FOR INSERT 
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update tenants" 
ON public.tenants 
FOR UPDATE 
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete tenants" 
ON public.tenants 
FOR DELETE 
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can read their own tenant" 
ON public.tenants 
FOR SELECT 
TO authenticated
USING (id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Admins can read all tenants" 
ON public.tenants 
FOR SELECT 
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));