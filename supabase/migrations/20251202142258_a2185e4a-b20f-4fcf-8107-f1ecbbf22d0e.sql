-- Fix: Webhook tokens exposure via permissive RLS policy
-- The current policy allows ANY authenticated user to read ALL tenant data including webhook_token

-- Step 1: Drop the overly permissive policy
DROP POLICY IF EXISTS "Authenticated users can read tenants" ON public.tenants;

-- Step 2: Create a policy that allows users to read only their own tenant (without webhook_token)
-- Users need to see tenant info for their assigned tenant
CREATE POLICY "Users can read their own tenant" ON public.tenants
FOR SELECT USING (
    id = public.get_user_tenant_id(auth.uid())
);

-- Step 3: Create a SECURITY DEFINER function for staff to get tenant data without webhook_token
CREATE OR REPLACE FUNCTION public.get_tenant_info_for_user(p_tenant_id uuid)
RETURNS TABLE(
    id uuid,
    name text,
    slug text,
    logo_url text,
    is_active boolean,
    email_domains text[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Only return non-sensitive tenant information
    RETURN QUERY
    SELECT 
        t.id,
        t.name,
        t.slug,
        t.logo_url,
        t.is_active,
        t.email_domains
    FROM public.tenants t
    WHERE t.id = p_tenant_id;
END;
$$;

-- Step 4: Create a function for admins to get webhook token when needed
CREATE OR REPLACE FUNCTION public.get_tenant_webhook_token(p_tenant_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_token text;
BEGIN
    -- Only allow admins
    IF NOT public.has_role(auth.uid(), 'admin') THEN
        RAISE EXCEPTION 'Access denied: Admin role required';
    END IF;
    
    SELECT webhook_token INTO v_token
    FROM public.tenants
    WHERE id = p_tenant_id;
    
    RETURN v_token;
END;
$$;