-- Drop the restrictive INSERT policy on user_tenants
DROP POLICY IF EXISTS "Admins can insert user_tenants" ON public.user_tenants;

-- Create a PERMISSIVE INSERT policy for admins
CREATE POLICY "Admins can insert user_tenants"
ON public.user_tenants
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Also fix UPDATE policy
DROP POLICY IF EXISTS "Admins can update user_tenants" ON public.user_tenants;

CREATE POLICY "Admins can update user_tenants"
ON public.user_tenants
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Also fix DELETE policy
DROP POLICY IF EXISTS "Admins can delete user_tenants" ON public.user_tenants;

CREATE POLICY "Admins can delete user_tenants"
ON public.user_tenants
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));