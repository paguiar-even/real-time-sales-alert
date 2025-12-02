-- Function to get sales status for staff users (bypasses RLS)
CREATE OR REPLACE FUNCTION public.get_sales_status_for_staff(
  p_token text,
  p_tenant_id uuid,
  p_limit integer DEFAULT 1
)
RETURNS TABLE (
  id bigint,
  vendas_minuto integer,
  vendas_status text,
  created_at timestamptz,
  tenant_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Validate token and get user_id
  SELECT sat.user_id INTO v_user_id
  FROM staff_access_tokens sat
  WHERE sat.token = p_token
    AND sat.is_active = true
    AND (sat.expires_at IS NULL OR sat.expires_at > now());
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Invalid or expired token';
  END IF;
  
  -- Verify user has staff role
  IF NOT EXISTS (
    SELECT 1 FROM user_roles ur 
    WHERE ur.user_id = v_user_id AND ur.role = 'staff'
  ) THEN
    RAISE EXCEPTION 'User does not have staff role';
  END IF;
  
  -- Update last_used_at
  UPDATE staff_access_tokens
  SET last_used_at = now()
  WHERE token = p_token;
  
  -- Return sales status for the specified tenant
  RETURN QUERY
  SELECT ss.id, ss.vendas_minuto, ss.vendas_status, ss.created_at, ss.tenant_id
  FROM sales_status ss
  WHERE ss.tenant_id = p_tenant_id
  ORDER BY ss.created_at DESC
  LIMIT p_limit;
END;
$$;

-- Function to get hourly sales aggregation for staff users
CREATE OR REPLACE FUNCTION public.get_hourly_sales_for_staff(
  p_token text,
  p_tenant_id uuid,
  p_hours integer DEFAULT 24
)
RETURNS TABLE (
  hour timestamptz,
  total_sales bigint,
  had_zero_sales boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Validate token and get user_id
  SELECT sat.user_id INTO v_user_id
  FROM staff_access_tokens sat
  WHERE sat.token = p_token
    AND sat.is_active = true
    AND (sat.expires_at IS NULL OR sat.expires_at > now());
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Invalid or expired token';
  END IF;
  
  -- Verify user has staff role
  IF NOT EXISTS (
    SELECT 1 FROM user_roles ur 
    WHERE ur.user_id = v_user_id AND ur.role = 'staff'
  ) THEN
    RAISE EXCEPTION 'User does not have staff role';
  END IF;
  
  -- Update last_used_at
  UPDATE staff_access_tokens
  SET last_used_at = now()
  WHERE token = p_token;
  
  -- Return hourly aggregation
  RETURN QUERY
  SELECT 
    date_trunc('hour', ss.created_at) as hour,
    SUM(ss.vendas_minuto)::bigint as total_sales,
    bool_or(ss.vendas_minuto = 0) as had_zero_sales
  FROM sales_status ss
  WHERE ss.tenant_id = p_tenant_id
    AND ss.created_at >= now() - (p_hours || ' hours')::interval
  GROUP BY date_trunc('hour', ss.created_at)
  ORDER BY hour DESC;
END;
$$;