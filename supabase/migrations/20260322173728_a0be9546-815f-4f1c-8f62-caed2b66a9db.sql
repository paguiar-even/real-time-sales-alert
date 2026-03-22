CREATE TABLE IF NOT EXISTS alert_notifications_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,
  tenant_name text NOT NULL,
  channels text[] DEFAULT '{}',
  results jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_alert_log_tenant_created 
  ON alert_notifications_log(tenant_id, created_at DESC);

ALTER TABLE alert_notifications_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view alert logs"
  ON alert_notifications_log FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role can insert alert logs"
  ON alert_notifications_log FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));