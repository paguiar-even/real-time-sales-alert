-- Create audit_log table for tracking tenant changes
CREATE TABLE public.tenant_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL,
  tenant_name text NOT NULL,
  action text NOT NULL CHECK (action IN ('created', 'updated', 'deleted', 'activated', 'deactivated', 'logo_updated', 'logo_removed')),
  changed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  changed_by_email text,
  old_values jsonb,
  new_values jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tenant_audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Admins can view audit logs"
ON public.tenant_audit_log
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Only admins can insert audit logs
CREATE POLICY "Admins can insert audit logs"
ON public.tenant_audit_log
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Create index for faster queries
CREATE INDEX idx_tenant_audit_log_tenant_id ON public.tenant_audit_log(tenant_id);
CREATE INDEX idx_tenant_audit_log_created_at ON public.tenant_audit_log(created_at DESC);