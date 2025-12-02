-- Fix RLS policies for user_tenants table - change from RESTRICTIVE to PERMISSIVE

-- Drop existing policies
DROP POLICY IF EXISTS "Users can see their own tenant assignments" ON public.user_tenants;
DROP POLICY IF EXISTS "Admins can insert user_tenants" ON public.user_tenants;
DROP POLICY IF EXISTS "Admins can update user_tenants" ON public.user_tenants;
DROP POLICY IF EXISTS "Admins can delete user_tenants" ON public.user_tenants;
DROP POLICY IF EXISTS "Admins can view all user_tenants" ON public.user_tenants;

-- Recreate policies as PERMISSIVE (default)
CREATE POLICY "Users can see their own tenant assignments" 
ON public.user_tenants 
FOR SELECT 
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admins can view all user_tenants" 
ON public.user_tenants 
FOR SELECT 
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert user_tenants" 
ON public.user_tenants 
FOR INSERT 
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update user_tenants" 
ON public.user_tenants 
FOR UPDATE 
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete user_tenants" 
ON public.user_tenants 
FOR DELETE 
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));