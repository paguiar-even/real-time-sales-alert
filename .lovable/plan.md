

## Plan: Alert Notification System

Four changes: create table, create edge function, update sales-webhook, add ErrorBoundary.

### 1. Database Migration — `alert_notifications_log` table

```sql
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
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role can insert alert logs"
  ON alert_notifications_log FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'));
```

### 2. Secrets

Request the following secrets from the user (only if they want each channel):
- `SLACK_WEBHOOK_URL`
- `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_RECIPIENT_NUMBER`

### 3. Create `supabase/functions/notify-alert/index.ts`

The edge function as provided by the user — handles Slack (Incoming Webhook) and WhatsApp (Meta API), with 5-minute debounce via `alert_notifications_log`.

Add to `supabase/config.toml`:
```toml
[functions.notify-alert]
verify_jwt = false
```

### 4. Update `supabase/functions/sales-webhook/index.ts`

**Problem**: `tenantData` is scoped inside the `if (slugToUse)` block and not accessible at the insertion success point. We need to hoist a `tenantName` variable.

- **Line ~102**: Add `let tenantName: string | null = null;` alongside `tenant_id`
- **Line ~148**: Add `tenantName = tenantData.name;` after `tenant_id = tenantData.id;`
- **After line 192** (after `console.log('Successfully inserted...')`): Insert the notify-alert call using `tenantName` instead of `tenantData?.name`:

```ts
if (vendas_status === 'ALERTA_ZERO' && tenant_id) {
  const notifyUrl = `${supabaseUrl}/functions/v1/notify-alert`;
  fetch(notifyUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${supabaseServiceKey}`,
    },
    body: JSON.stringify({
      tenant_id,
      tenant_name: tenantName || slugToUse || 'Desconhecido',
      vendas_minuto,
      vendas_status,
    }),
  }).catch(e => console.error('Erro ao chamar notify-alert:', e));
}
```

### 5. Create `src/components/ErrorBoundary.tsx`

A React class component ErrorBoundary that catches render errors and shows a friendly fallback UI with a "reload" button.

### 6. Update `src/main.tsx`

Wrap `<App />` with `<ErrorBoundary>`.

---

**Technical note**: The notify-alert call is fire-and-forget (non-blocking) so it won't slow down the webhook response. The edge function itself handles debounce by checking `alert_notifications_log` for recent entries before sending.

