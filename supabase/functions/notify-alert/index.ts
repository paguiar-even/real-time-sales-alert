import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotifyPayload {
  tenant_id: string;
  tenant_name: string;
  vendas_minuto: number;
  vendas_status: 'OK' | 'ALERTA_ZERO';
}

const DEBOUNCE_MINUTES = 5;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const payload: NotifyPayload = await req.json();
    const { tenant_id, tenant_name, vendas_minuto, vendas_status } = payload;

    if (vendas_status !== 'ALERTA_ZERO') {
      return new Response(JSON.stringify({ skipped: true, reason: 'status is OK' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Debounce: skip if already notified recently
    const debounceWindow = new Date();
    debounceWindow.setMinutes(debounceWindow.getMinutes() - DEBOUNCE_MINUTES);

    const { data: recentAlert } = await supabase
      .from('alert_notifications_log')
      .select('id')
      .eq('tenant_id', tenant_id)
      .gte('created_at', debounceWindow.toISOString())
      .limit(1)
      .maybeSingle();

    if (recentAlert) {
      return new Response(JSON.stringify({ skipped: true, reason: 'debounce' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const now = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    const plainMessage = `🚨 ALERTA ZERO — ${tenant_name}\n\nNenhuma venda registrada no último minuto.\n🕐 ${now}`;
    const results: Record<string, string> = {};

    // SLACK
    const slackWebhookUrl = Deno.env.get('SLACK_WEBHOOK_URL');
    if (slackWebhookUrl) {
      try {
        const slackRes = await fetch(slackWebhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            blocks: [
              { type: 'header', text: { type: 'plain_text', text: '🚨 ALERTA ZERO DE VENDAS', emoji: true } },
              {
                type: 'section',
                fields: [
                  { type: 'mrkdwn', text: `*Cliente:*\n${tenant_name}` },
                  { type: 'mrkdwn', text: `*Vendas/min:*\n${vendas_minuto}` },
                  { type: 'mrkdwn', text: `*Horário:*\n${now}` },
                  { type: 'mrkdwn', text: `*Status:*\n🔴 Nenhuma venda no último minuto` },
                ],
              },
              { type: 'context', elements: [{ type: 'mrkdwn', text: 'Verifique o monitor de vendas imediatamente.' }] },
            ],
          }),
        });
        results.slack = slackRes.ok ? 'sent' : `error_${slackRes.status}`;
      } catch (e) {
        results.slack = `error: ${(e as Error).message}`;
      }
    } else {
      results.slack = 'not_configured';
    }

    // WHATSAPP
    const waToken = Deno.env.get('WHATSAPP_TOKEN');
    const waPhoneId = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID');
    const waRecipient = Deno.env.get('WHATSAPP_RECIPIENT_NUMBER');
    if (waToken && waPhoneId && waRecipient) {
      try {
        const waRes = await fetch(`https://graph.facebook.com/v19.0/${waPhoneId}/messages`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${waToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: waRecipient,
            type: 'text',
            text: { body: plainMessage },
          }),
        });
        results.whatsapp = waRes.ok ? 'sent' : `error_${waRes.status}`;
      } catch (e) {
        results.whatsapp = `error: ${(e as Error).message}`;
      }
    } else {
      results.whatsapp = 'not_configured';
    }

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
            subscriptions.map((sub: any) =>
              webpush.sendNotification(
                { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
                pushPayload
              )
            )
          );

          const sent = pushResults.filter((r: any) => r.status === 'fulfilled').length;
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

    // Log notification
    await supabase.from('alert_notifications_log').insert({
      tenant_id,
      tenant_name,
      channels: Object.keys(results).filter(k => results[k] === 'sent' || results[k]?.startsWith?.('sent_to_')),
      results,
    });

    console.log('Notification results:', results);

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('notify-alert error:', msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
