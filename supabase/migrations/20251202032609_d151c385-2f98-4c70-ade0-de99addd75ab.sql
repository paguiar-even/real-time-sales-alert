-- Function to get all tenants for staff access (requires valid token)
CREATE OR REPLACE FUNCTION public.get_tenants_for_staff(p_token text)
RETURNS TABLE(id uuid, name text, slug text, logo_url text, is_active boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_valid boolean;
BEGIN
  -- First validate the token
  SELECT is_valid INTO v_is_valid
  FROM public.validate_staff_token_only(p_token)
  LIMIT 1;
  
  IF v_is_valid IS NOT TRUE THEN
    RETURN; -- Return empty result if token is invalid
  END IF;
  
  RETURN QUERY
  SELECT 
    t.id,
    t.name,
    t.slug,
    t.logo_url,
    t.is_active
  FROM public.tenants t
  ORDER BY t.name;
END;
$$;