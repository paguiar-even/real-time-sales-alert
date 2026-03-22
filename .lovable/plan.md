

## Plan: Add Push Notifications to notify-alert + Configure VAPID Secrets

### 1. Request VAPID secrets

Use the secrets tool to request three secrets from the user:
- `VAPID_PRIVATE_KEY` — the private VAPID key generated via `npx web-push generate-vapid-keys`
- `VAPID_PUBLIC_KEY` — the public VAPID key (same generation)
- `VAPID_SUBJECT` — mailto URI (e.g. `mailto:paulo@edjdigital.com.br`)

**Note**: The user also needs to set `VITE_VAPID_PUBLIC_KEY` as a build secret in Workspace Settings, since it's referenced in the frontend hook via `import.meta.env.VITE_VAPID_PUBLIC_KEY`.

### 2. Update `supabase/functions/notify-alert/index.ts`

Insert the push notification block after the WhatsApp section (line 118) and before the log insertion (line 120):

```ts
// PUSH NOTIFICATIONS
const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');
const vapidSubject = Deno.env.get('VAPID_SUBJECT') || 'mailto:admin@even.com.br';
const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');

if (vapidPrivateKey && vapidPublicKey) {
  try {
    const { data: subscriptions } = await supabase
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth');

    if (subscriptions && subscriptions.length > 0) {
      const webpush = (await import('npm:web-push@3.6.7')).default;
      webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

      const pushPayload = JSON.stringify({
        title: `🚨 ALERTA ZERO — ${tenant_name}`,
        body: `Nenhuma venda no último minuto. ${now}`,
        url: '/monitor',
      });

      const pushResults = await Promise.allSettled(
        subscriptions.map((sub) =>
          webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            pushPayload
          )
        )
      );

      const sent = pushResults.filter(r => r.status === 'fulfilled').length;
      results.push = `sent_to_${sent}_of_${subscriptions.length}`;
    } else {
      results.push = 'no_subscribers';
    }
  } catch (e) {
    results.push = `error: ${(e as Error).message}`;
  }
} else {
  results.push = 'not_configured';
}
```

Also update the channels filter in the log insertion (line 124) to account for push results that start with `sent_to_`:
```ts
channels: Object.keys(results).filter(k => results[k] === 'sent' || results[k]?.startsWith?.('sent_to_')),
```

### 3. Deploy and test

Deploy the updated edge function and verify with `supabase--invoke_edge_function`.

---

**Technical notes:**
- The edge function uses `import('npm:web-push@3.6.7')` which Deno supports natively
- Push subscriptions are read from the `push_subscriptions` table (no RLS issue since we use service role key)
- Failed push sends (expired subscriptions) are handled gracefully via `Promise.allSettled`

