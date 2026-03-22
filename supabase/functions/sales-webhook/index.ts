import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-token',
};

interface SalesWebhookPayload {
  vendas_minuto: number;
  vendas_status?: 'OK' | 'ALERTA_ZERO';
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    console.log('Method not allowed:', req.method);
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { 
        status: 405, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }

  try {
    // Extract tenant slug from URL path
    // URL format: /sales-webhook or /sales-webhook/tenant-slug
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(Boolean);
    
    // pathParts will be like ['functions', 'v1', 'sales-webhook', 'tenant-slug'] or ['sales-webhook', 'tenant-slug']
    // Find index of 'sales-webhook' and get the next part
    const webhookIndex = pathParts.findIndex(p => p === 'sales-webhook');
    const tenantSlug = webhookIndex >= 0 && pathParts[webhookIndex + 1] 
      ? pathParts[webhookIndex + 1] 
      : null;
    
    console.log('Parsed URL path:', { pathParts, tenantSlug });

    // Get provided token from headers
    const providedToken = req.headers.get('x-webhook-token') || req.headers.get('authorization')?.replace('Bearer ', '');

    if (!providedToken) {
      console.log('Unauthorized: Missing token');
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Missing token' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Parse request body
    const rawBody = await req.json();
    console.log('Received webhook payload:', rawBody);

    // Parse vendas_minuto (accept both string and number)
    const vendas_minuto = typeof rawBody.vendas_minuto === 'string' 
      ? parseInt(rawBody.vendas_minuto, 10) 
      : rawBody.vendas_minuto;

    if (isNaN(vendas_minuto) || vendas_minuto === null || vendas_minuto === undefined) {
      console.log('Validation error: vendas_minuto must be a valid number');
      return new Response(
        JSON.stringify({ error: 'vendas_minuto must be a valid number' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Determine status automatically if not provided
    const vendas_status = rawBody.vendas_status || (vendas_minuto === 0 ? 'ALERTA_ZERO' : 'OK');

    if (!['OK', 'ALERTA_ZERO'].includes(vendas_status)) {
      console.log('Validation error: invalid vendas_status');
      return new Response(
        JSON.stringify({ error: 'vendas_status must be "OK" or "ALERTA_ZERO"' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Lookup tenant and validate token
    const slugToUse = tenantSlug || rawBody.tenant_slug;
    let tenant_id: string | null = null;
    let tenantName: string | null = null;
    
    if (slugToUse) {
      // Find tenant by slug and validate its specific token
      const { data: tenantData, error: tenantError } = await supabase
        .from('tenants')
        .select('id, name, webhook_token')
        .eq('slug', slugToUse)
        .eq('is_active', true)
        .maybeSingle();

      if (tenantError) {
        console.error('Error looking up tenant:', tenantError);
        return new Response(
          JSON.stringify({ error: 'Error looking up tenant' }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
      
      if (!tenantData) {
        console.log(`No tenant found for slug "${slugToUse}"`);
        return new Response(
          JSON.stringify({ error: `Tenant not found: ${slugToUse}` }),
          { 
            status: 404, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      // Validate per-tenant token
      if (tenantData.webhook_token !== providedToken) {
        console.log(`Unauthorized: Invalid token for tenant "${slugToUse}"`);
        return new Response(
          JSON.stringify({ error: 'Unauthorized: Invalid token for this tenant' }),
          { 
            status: 401, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      tenant_id = tenantData.id;
      tenantName = tenantData.name;
      console.log(`Authenticated tenant: ${tenantData.name} (${tenant_id})`);
    } else {
      // No tenant slug provided - use global token (backward compatibility)
      const globalToken = Deno.env.get('SALES_WEBHOOK_TOKEN');
      if (!globalToken || globalToken !== providedToken) {
        console.log('Unauthorized: Invalid global token');
        return new Response(
          JSON.stringify({ error: 'Unauthorized: Invalid token' }),
          { 
            status: 401, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
      console.log('Authenticated with global token (no tenant specified)');
    }

    // Insert data into sales_status table
    const insertData: Record<string, any> = {
      vendas_minuto,
      vendas_status
    };

    if (tenant_id) {
      insertData.tenant_id = tenant_id;
    }

    const { data, error } = await supabase
      .from('sales_status')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('Database insert error:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to insert data', details: error.message }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Successfully inserted sales status:', data);

    // Dispara notificações de alerta em background (não bloqueia a resposta)
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

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Sales status recorded successfully',
        tenant_slug: slugToUse || null,
        data 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Webhook processing error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: errorMessage }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
