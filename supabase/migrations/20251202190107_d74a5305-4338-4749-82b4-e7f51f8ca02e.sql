-- Update admin_create_user function to support admin role
CREATE OR REPLACE FUNCTION public.admin_create_user(
    user_email text, 
    user_password text, 
    user_full_name text DEFAULT NULL::text, 
    user_phone text DEFAULT NULL::text, 
    assign_staff boolean DEFAULT false,
    assign_admin boolean DEFAULT false
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
        extensions.crypt(user_password, extensions.gen_salt('bf')),
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
    
    -- Assign admin role if requested
    IF assign_admin THEN
        INSERT INTO public.user_roles (user_id, role)
        VALUES (new_user_id, 'admin')
        ON CONFLICT (user_id, role) DO NOTHING;
    END IF;
    
    RETURN new_user_id;
END;
$function$;

-- Function to get admin users
CREATE OR REPLACE FUNCTION public.get_admin_users()
RETURNS TABLE(
    user_id uuid, 
    email text, 
    full_name text, 
    phone text, 
    mfa_enabled boolean, 
    created_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
        p.created_at
    FROM public.user_roles ur
    JOIN auth.users u ON u.id = ur.user_id
    LEFT JOIN public.profiles p ON p.id = ur.user_id
    WHERE ur.role = 'admin'
    ORDER BY p.created_at DESC;
END;
$function$;

-- Function to assign admin role
CREATE OR REPLACE FUNCTION public.assign_admin_role(target_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
    -- Only allow admins
    IF NOT public.has_role(auth.uid(), 'admin') THEN
        RAISE EXCEPTION 'Access denied: Admin role required';
    END IF;
    
    -- Insert admin role if not exists
    INSERT INTO public.user_roles (user_id, role)
    VALUES (target_user_id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
    
    RETURN true;
END;
$function$;

-- Function to remove admin role (with protection for master admin)
CREATE OR REPLACE FUNCTION public.remove_admin_role(target_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    target_email text;
BEGIN
    -- Only allow admins
    IF NOT public.has_role(auth.uid(), 'admin') THEN
        RAISE EXCEPTION 'Access denied: Admin role required';
    END IF;
    
    -- Get target user email
    SELECT email INTO target_email FROM auth.users WHERE id = target_user_id;
    
    -- Protect master admin
    IF target_email = 'admin@even7.com.br' THEN
        RAISE EXCEPTION 'Cannot remove admin role from master admin';
    END IF;
    
    -- Cannot remove your own admin role
    IF target_user_id = auth.uid() THEN
        RAISE EXCEPTION 'Cannot remove your own admin role';
    END IF;
    
    -- Remove admin role
    DELETE FROM public.user_roles 
    WHERE user_id = target_user_id AND role = 'admin';
    
    RETURN true;
END;
$function$;