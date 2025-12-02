-- Create table for internal Even staff access tokens
CREATE TABLE public.staff_access_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  token text NOT NULL UNIQUE DEFAULT encode(extensions.gen_random_bytes(32), 'hex'),
  name text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  last_used_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.staff_access_tokens ENABLE ROW LEVEL SECURITY;

-- Only admins can manage staff tokens
CREATE POLICY "Admins can view all staff tokens"
ON public.staff_access_tokens
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert staff tokens"
ON public.staff_access_tokens
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update staff tokens"
ON public.staff_access_tokens
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete staff tokens"
ON public.staff_access_tokens
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- Create index for token lookup
CREATE INDEX idx_staff_access_tokens_token ON public.staff_access_tokens(token);
CREATE INDEX idx_staff_access_tokens_user_id ON public.staff_access_tokens(user_id);

-- Function to validate staff token and get tenant data
CREATE OR REPLACE FUNCTION public.validate_staff_token(
  p_token text,
  p_tenant_slug text
)
RETURNS TABLE(
  is_valid boolean,
  tenant_id uuid,
  tenant_name text,
  tenant_logo_url text,
  user_email text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token_record RECORD;
  v_tenant_record RECORD;
BEGIN
  -- Check if token exists and is valid
  SELECT sat.*, u.email as user_email
  INTO v_token_record
  FROM public.staff_access_tokens sat
  JOIN auth.users u ON u.id = sat.user_id
  WHERE sat.token = p_token
    AND sat.is_active = true
    AND (sat.expires_at IS NULL OR sat.expires_at > now());
  
  IF v_token_record IS NULL THEN
    RETURN QUERY SELECT false, NULL::uuid, NULL::text, NULL::text, NULL::text;
    RETURN;
  END IF;
  
  -- Check if tenant exists
  SELECT t.*
  INTO v_tenant_record
  FROM public.tenants t
  WHERE t.slug = p_tenant_slug AND t.is_active = true;
  
  IF v_tenant_record IS NULL THEN
    RETURN QUERY SELECT false, NULL::uuid, NULL::text, NULL::text, NULL::text;
    RETURN;
  END IF;
  
  -- Update last used timestamp
  UPDATE public.staff_access_tokens
  SET last_used_at = now()
  WHERE id = v_token_record.id;
  
  -- Log access
  INSERT INTO public.access_logs (user_id, tenant_id, user_email, tenant_name, action)
  VALUES (v_token_record.user_id, v_tenant_record.id, v_token_record.user_email, v_tenant_record.name, 'staff_access');
  
  RETURN QUERY SELECT 
    true,
    v_tenant_record.id,
    v_tenant_record.name,
    v_tenant_record.logo_url,
    v_token_record.user_email;
END;
$$;

-- Function to get staff tokens with user emails
CREATE OR REPLACE FUNCTION public.get_staff_tokens()
RETURNS TABLE(
  id uuid,
  user_id uuid,
  user_email text,
  token text,
  name text,
  is_active boolean,
  last_used_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;
  
  RETURN QUERY
  SELECT 
    sat.id,
    sat.user_id,
    u.email::text as user_email,
    sat.token,
    sat.name,
    sat.is_active,
    sat.last_used_at,
    sat.expires_at,
    sat.created_at
  FROM public.staff_access_tokens sat
  JOIN auth.users u ON u.id = sat.user_id
  ORDER BY sat.created_at DESC;
END;
$$;