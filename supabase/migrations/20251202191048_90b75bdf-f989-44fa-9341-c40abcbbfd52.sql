-- Function to reset user password (admin only)
CREATE OR REPLACE FUNCTION public.admin_reset_user_password(target_user_id uuid, new_password text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    -- Only allow admins
    IF NOT public.has_role(auth.uid(), 'admin') THEN
        RAISE EXCEPTION 'Access denied: Admin role required';
    END IF;
    
    -- Validate password length
    IF length(new_password) < 6 THEN
        RAISE EXCEPTION 'Password must be at least 6 characters';
    END IF;
    
    -- Update user password
    UPDATE auth.users
    SET encrypted_password = extensions.crypt(new_password, extensions.gen_salt('bf')),
        updated_at = now()
    WHERE id = target_user_id;
    
    RETURN true;
END;
$$;

-- Function to toggle MFA requirement for a user (admin only)
CREATE OR REPLACE FUNCTION public.admin_toggle_user_mfa(target_user_id uuid, mfa_required boolean)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    -- Only allow admins
    IF NOT public.has_role(auth.uid(), 'admin') THEN
        RAISE EXCEPTION 'Access denied: Admin role required';
    END IF;
    
    -- If disabling MFA, also delete existing factors
    IF NOT mfa_required THEN
        DELETE FROM auth.mfa_factors WHERE user_id = target_user_id;
    END IF;
    
    -- Update profile
    UPDATE public.profiles 
    SET mfa_enabled = mfa_required,
        updated_at = now()
    WHERE id = target_user_id;
    
    RETURN true;
END;
$$;