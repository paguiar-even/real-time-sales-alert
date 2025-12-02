-- Add is_blocked field to user_tenants table
ALTER TABLE public.user_tenants 
ADD COLUMN is_blocked boolean NOT NULL DEFAULT false;

-- Create function to reset user MFA (security definer to access auth schema)
CREATE OR REPLACE FUNCTION public.admin_reset_user_mfa(target_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow admins to reset MFA
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;
  
  -- Delete all MFA factors for the user
  DELETE FROM auth.mfa_factors WHERE user_id = target_user_id;
  
  -- Update profile to reflect MFA is disabled
  UPDATE public.profiles SET mfa_enabled = false WHERE id = target_user_id;
  
  RETURN true;
END;
$$;

-- Create function to create a new user with profile (for admin use)
CREATE OR REPLACE FUNCTION public.admin_create_user(
  user_email text,
  user_password text,
  user_full_name text DEFAULT NULL,
  user_phone text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_user_id uuid;
BEGIN
  -- Only allow admins to create users
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;
  
  -- Create the user in auth.users
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    user_email,
    crypt(user_password, gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    jsonb_build_object('full_name', user_full_name),
    now(),
    now(),
    '',
    '',
    '',
    ''
  )
  RETURNING id INTO new_user_id;
  
  -- Update profile with phone if provided
  IF user_phone IS NOT NULL THEN
    UPDATE public.profiles SET phone = user_phone WHERE id = new_user_id;
  END IF;
  
  RETURN new_user_id;
END;
$$;

-- Create function to get user details by tenant
CREATE OR REPLACE FUNCTION public.get_tenant_users(target_tenant_id uuid)
RETURNS TABLE(
  user_tenant_id uuid,
  user_id uuid,
  email text,
  full_name text,
  phone text,
  mfa_enabled boolean,
  is_blocked boolean,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow admins
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;
  
  RETURN QUERY
  SELECT 
    ut.id as user_tenant_id,
    ut.user_id,
    u.email::text,
    p.full_name,
    p.phone,
    p.mfa_enabled,
    ut.is_blocked,
    ut.created_at
  FROM public.user_tenants ut
  JOIN auth.users u ON u.id = ut.user_id
  LEFT JOIN public.profiles p ON p.id = ut.user_id
  WHERE ut.tenant_id = target_tenant_id
  ORDER BY ut.created_at DESC;
END;
$$;