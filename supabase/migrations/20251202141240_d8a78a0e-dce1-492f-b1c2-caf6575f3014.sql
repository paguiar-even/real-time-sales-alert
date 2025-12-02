-- Drop and recreate admin_create_user function with correct schema reference
CREATE OR REPLACE FUNCTION public.admin_create_user(
    user_email text, 
    user_password text, 
    user_full_name text DEFAULT NULL::text, 
    user_phone text DEFAULT NULL::text, 
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
    
    RETURN new_user_id;
END;
$$;