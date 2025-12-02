-- Function to assign staff role to a user
CREATE OR REPLACE FUNCTION public.assign_staff_role(target_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow admins
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;
  
  -- Insert staff role if not exists
  INSERT INTO public.user_roles (user_id, role)
  VALUES (target_user_id, 'staff')
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN true;
END;
$$;

-- Function to check if user is staff
CREATE OR REPLACE FUNCTION public.is_staff(user_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = user_uuid
      AND role = 'staff'
  )
$$;

-- Update admin_create_user to optionally assign staff role
CREATE OR REPLACE FUNCTION public.admin_create_user(
  user_email text, 
  user_password text, 
  user_full_name text DEFAULT NULL, 
  user_phone text DEFAULT NULL,
  assign_staff boolean DEFAULT false
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
  
  -- Assign staff role if requested
  IF assign_staff THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (new_user_id, 'staff')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  
  RETURN new_user_id;
END;
$$;

-- Function to get staff users (users with staff role)
CREATE OR REPLACE FUNCTION public.get_staff_users()
RETURNS TABLE(
  user_id uuid,
  email text,
  full_name text,
  phone text,
  mfa_enabled boolean,
  created_at timestamp with time zone,
  has_active_token boolean
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
    ur.user_id,
    u.email::text,
    p.full_name,
    p.phone,
    COALESCE(p.mfa_enabled, false),
    p.created_at,
    EXISTS(
      SELECT 1 FROM public.staff_access_tokens sat 
      WHERE sat.user_id = ur.user_id AND sat.is_active = true
    ) as has_active_token
  FROM public.user_roles ur
  JOIN auth.users u ON u.id = ur.user_id
  LEFT JOIN public.profiles p ON p.id = ur.user_id
  WHERE ur.role = 'staff'
  ORDER BY p.created_at DESC;
END;
$$;

-- Function to remove staff role from a user
CREATE OR REPLACE FUNCTION public.remove_staff_role(target_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow admins
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;
  
  -- Remove staff role
  DELETE FROM public.user_roles 
  WHERE user_id = target_user_id AND role = 'staff';
  
  -- Also deactivate any staff tokens
  UPDATE public.staff_access_tokens
  SET is_active = false
  WHERE user_id = target_user_id;
  
  RETURN true;
END;
$$;