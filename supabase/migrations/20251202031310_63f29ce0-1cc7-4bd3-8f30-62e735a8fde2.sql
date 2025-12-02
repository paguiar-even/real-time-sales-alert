-- Create access_logs table to track user access to monitoring
CREATE TABLE public.access_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL,
  user_email text,
  tenant_name text,
  ip_address text,
  user_agent text,
  action text NOT NULL DEFAULT 'monitor_access',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.access_logs ENABLE ROW LEVEL SECURITY;

-- Admins can view all logs
CREATE POLICY "Admins can view all access logs"
ON public.access_logs
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Users can insert their own access logs
CREATE POLICY "Users can insert their own access logs"
ON public.access_logs
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_access_logs_tenant_id ON public.access_logs(tenant_id);
CREATE INDEX idx_access_logs_user_id ON public.access_logs(user_id);
CREATE INDEX idx_access_logs_created_at ON public.access_logs(created_at DESC);

-- Function to get access logs for a tenant
CREATE OR REPLACE FUNCTION public.get_tenant_access_logs(
  target_tenant_id uuid,
  limit_count integer DEFAULT 100
)
RETURNS TABLE(
  id uuid,
  user_id uuid,
  user_email text,
  action text,
  ip_address text,
  user_agent text,
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
    al.id,
    al.user_id,
    al.user_email,
    al.action,
    al.ip_address,
    al.user_agent,
    al.created_at
  FROM public.access_logs al
  WHERE al.tenant_id = target_tenant_id
  ORDER BY al.created_at DESC
  LIMIT limit_count;
END;
$$;

-- Function to log user access (called from client)
CREATE OR REPLACE FUNCTION public.log_user_access(
  p_tenant_id uuid,
  p_tenant_name text,
  p_action text DEFAULT 'monitor_access'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_user_email text;
  v_log_id uuid;
BEGIN
  -- Get current user info
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;
  
  SELECT email INTO v_user_email FROM auth.users WHERE id = v_user_id;
  
  -- Insert access log
  INSERT INTO public.access_logs (user_id, tenant_id, user_email, tenant_name, action)
  VALUES (v_user_id, p_tenant_id, v_user_email, p_tenant_name, p_action)
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$;