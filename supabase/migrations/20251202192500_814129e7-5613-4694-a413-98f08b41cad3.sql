-- Fix tenants table policies
DROP POLICY IF EXISTS "Admins can insert tenants" ON public.tenants;
DROP POLICY IF EXISTS "Admins can update tenants" ON public.tenants;
DROP POLICY IF EXISTS "Admins can delete tenants" ON public.tenants;

CREATE POLICY "Admins can insert tenants"
ON public.tenants FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update tenants"
ON public.tenants FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete tenants"
ON public.tenants FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Fix staff_access_tokens table policies
DROP POLICY IF EXISTS "Admins can insert staff tokens" ON public.staff_access_tokens;
DROP POLICY IF EXISTS "Admins can update staff tokens" ON public.staff_access_tokens;
DROP POLICY IF EXISTS "Admins can delete staff tokens" ON public.staff_access_tokens;

CREATE POLICY "Admins can insert staff tokens"
ON public.staff_access_tokens FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update staff tokens"
ON public.staff_access_tokens FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete staff tokens"
ON public.staff_access_tokens FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Fix tenant_audit_log table policies
DROP POLICY IF EXISTS "Admins can insert audit logs" ON public.tenant_audit_log;

CREATE POLICY "Admins can insert audit logs"
ON public.tenant_audit_log FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Fix user_roles table policies
DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;

CREATE POLICY "Admins can insert roles"
ON public.user_roles FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update roles"
ON public.user_roles FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete roles"
ON public.user_roles FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Fix profiles table admin update policy
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;

CREATE POLICY "Admins can update all profiles"
ON public.profiles FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));