

## Plan: Create Push Notifications Hook + Database Table

### 1. Database Migration — `push_subscriptions` table

The hook references `push_subscriptions` which doesn't exist. Create it:

```sql
CREATE TABLE push_subscriptions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own subscriptions"
  ON push_subscriptions FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
```

### 2. Create `src/hooks/usePushNotifications.ts`

Exactly as provided by the user — registers service worker, manages push subscription via PushManager API, stores/removes subscription in `push_subscriptions` table.

**Note**: Requires `VITE_VAPID_PUBLIC_KEY` env var to be set for push to work. Will need VAPID keys generated and the public key added to the project.

