import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Rate limit: 20 requests per minute per IP (more lenient for sitekey retrieval)
const RATE_LIMIT_MAX_REQUESTS = 20;
const RATE_LIMIT_WINDOW_SECONDS = 60;

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  let rateLimitHeaders: Record<string, string> = {};

  try {
    // Get client IP from headers
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                     req.headers.get('cf-connecting-ip') || 
                     req.headers.get('x-real-ip') || 
                     'unknown';
    
    console.log(`[get-turnstile-sitekey] Request from IP: ${clientIp}`);
    
    // Initialize Supabase client with service role for rate limiting
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Check rate limit
    const { data: rateLimitData, error: rateLimitError } = await supabase
      .rpc('check_rate_limit', {
        p_identifier: clientIp,
        p_endpoint: 'get-turnstile-sitekey',
        p_max_requests: RATE_LIMIT_MAX_REQUESTS,
        p_window_seconds: RATE_LIMIT_WINDOW_SECONDS
      });
    
    if (rateLimitError) {
      console.error('[get-turnstile-sitekey] Rate limit check error:', rateLimitError);
      // Continue without rate limiting if there's an error
    } else if (rateLimitData && rateLimitData.length > 0) {
      const rlData = rateLimitData[0];
      rateLimitHeaders = {
        'X-RateLimit-Remaining': String(rlData.remaining),
        'X-RateLimit-Reset': String(rlData.reset_at)
      };
      
      if (!rlData.allowed) {
        console.log(`[get-turnstile-sitekey] Rate limit exceeded for IP: ${clientIp}`);
        return new Response(
          JSON.stringify({ 
            error: 'Too many requests. Please try again later.',
            retryAfter: rlData.reset_at
          }),
          { 
            status: 429, 
            headers: { 
              ...corsHeaders, 
              ...rateLimitHeaders,
              'Content-Type': 'application/json',
              'Retry-After': '60'
            } 
          }
        );
      }
    }

    const siteKey = Deno.env.get('TURNSTILE_SITE_KEY');
    
    if (!siteKey) {
      console.error('[get-turnstile-sitekey] TURNSTILE_SITE_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Turnstile not configured' }),
        { status: 500, headers: { ...corsHeaders, ...rateLimitHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[get-turnstile-sitekey] Site key returned for IP: ${clientIp}`);
    return new Response(
      JSON.stringify({ siteKey }),
      { status: 200, headers: { ...corsHeaders, ...rateLimitHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[get-turnstile-sitekey] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, ...rateLimitHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
