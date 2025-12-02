import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-token',
};

interface SalesWebhookPayload {
  vendas_minuto: number;
  vendas_status: 'OK' | 'ALERTA_ZERO';
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
    // Validate webhook token
    const webhookToken = Deno.env.get('SALES_WEBHOOK_TOKEN');
    const providedToken = req.headers.get('x-webhook-token') || req.headers.get('authorization')?.replace('Bearer ', '');

    if (!webhookToken) {
      console.error('SALES_WEBHOOK_TOKEN not configured');
      return new Response(
        JSON.stringify({ error: 'Webhook token not configured on server' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (!providedToken || providedToken !== webhookToken) {
      console.log('Unauthorized: Invalid or missing token');
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Invalid or missing token' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Parse request body
    const body: SalesWebhookPayload = await req.json();
    console.log('Received webhook payload:', body);

    // Validate payload
    if (typeof body.vendas_minuto !== 'number') {
      console.log('Validation error: vendas_minuto must be a number');
      return new Response(
        JSON.stringify({ error: 'vendas_minuto must be a number' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (!['OK', 'ALERTA_ZERO'].includes(body.vendas_status)) {
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

    // Insert data into sales_status table
    const { data, error } = await supabase
      .from('sales_status')
      .insert({
        vendas_minuto: body.vendas_minuto,
        vendas_status: body.vendas_status
      })
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

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Sales status recorded successfully',
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
