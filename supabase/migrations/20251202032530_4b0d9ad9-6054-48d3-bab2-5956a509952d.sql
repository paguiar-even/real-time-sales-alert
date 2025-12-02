-- Function to validate a staff token and return user info (without tenant validation)
CREATE OR REPLACE FUNCTION public.validate_staff_token_only(p_token text)
RETURNS TABLE(is_valid boolean, user_id uuid, user_email text, token_name text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token_record RECORD;
BEGIN
  -- Check if token exists and is valid
  SELECT sat.*, u.email as email
  INTO v_token_record
  FROM public.staff_access_tokens sat
  JOIN auth.users u ON u.id = sat.user_id
  WHERE sat.token = p_token
    AND sat.is_active = true
    AND (sat.expires_at IS NULL OR sat.expires_at > now());
  
  IF v_token_record IS NULL THEN
    RETURN QUERY SELECT false, NULL::uuid, NULL::text, NULL::text;
    RETURN;
  END IF;
  
  RETURN QUERY SELECT 
    true,
    v_token_record.user_id,
    v_token_record.email,
    v_token_record.name;
END;
$$;