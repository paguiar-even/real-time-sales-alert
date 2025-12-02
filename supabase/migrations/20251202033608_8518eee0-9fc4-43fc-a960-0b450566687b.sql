-- Drop existing policy and create a more secure one
DROP POLICY IF EXISTS "Users can read their tenant sales data" ON public.sales_status;

-- Create new secure policy that requires tenant_id match
-- No more NULL tenant_id access for regular users
CREATE POLICY "Users can only read their own tenant sales data" 
ON public.sales_status 
FOR SELECT 
USING (
  -- User must be authenticated
  auth.uid() IS NOT NULL
  AND
  -- Tenant must match user's tenant
  tenant_id = get_user_tenant_id(auth.uid())
);

-- Staff users need a separate way to access data via the RPC functions
-- The validate_staff_token and get_tenants_for_staff functions use SECURITY DEFINER
-- so they bypass RLS when needed