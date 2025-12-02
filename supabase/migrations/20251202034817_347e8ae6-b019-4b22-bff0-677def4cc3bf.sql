-- Create rate limiting table
CREATE TABLE public.rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier text NOT NULL, -- IP address or user ID
  endpoint text NOT NULL,
  request_count integer NOT NULL DEFAULT 1,
  window_start timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create index for fast lookups
CREATE INDEX idx_rate_limits_lookup ON public.rate_limits (identifier, endpoint, window_start);

-- Enable RLS (but allow edge functions to bypass via service role)
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Create function to check and update rate limit
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_identifier text,
  p_endpoint text,
  p_max_requests integer DEFAULT 10,
  p_window_seconds integer DEFAULT 60
)
RETURNS TABLE (
  allowed boolean,
  remaining integer,
  reset_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_window_start timestamptz;
  v_current_count integer;
  v_rate_limit_id uuid;
BEGIN
  v_window_start := now() - (p_window_seconds || ' seconds')::interval;
  
  -- Clean up old entries (older than 1 hour)
  DELETE FROM rate_limits 
  WHERE window_start < now() - interval '1 hour';
  
  -- Check for existing rate limit entry within the window
  SELECT id, request_count INTO v_rate_limit_id, v_current_count
  FROM rate_limits
  WHERE identifier = p_identifier
    AND endpoint = p_endpoint
    AND window_start > v_window_start
  ORDER BY window_start DESC
  LIMIT 1;
  
  IF v_rate_limit_id IS NULL THEN
    -- No existing entry, create new one
    INSERT INTO rate_limits (identifier, endpoint, request_count, window_start)
    VALUES (p_identifier, p_endpoint, 1, now());
    
    RETURN QUERY SELECT 
      true AS allowed,
      (p_max_requests - 1) AS remaining,
      (now() + (p_window_seconds || ' seconds')::interval) AS reset_at;
  ELSE
    IF v_current_count >= p_max_requests THEN
      -- Rate limit exceeded
      RETURN QUERY SELECT 
        false AS allowed,
        0 AS remaining,
        (SELECT window_start + (p_window_seconds || ' seconds')::interval 
         FROM rate_limits WHERE id = v_rate_limit_id) AS reset_at;
    ELSE
      -- Increment counter
      UPDATE rate_limits 
      SET request_count = request_count + 1
      WHERE id = v_rate_limit_id;
      
      RETURN QUERY SELECT 
        true AS allowed,
        (p_max_requests - v_current_count - 1) AS remaining,
        (SELECT window_start + (p_window_seconds || ' seconds')::interval 
         FROM rate_limits WHERE id = v_rate_limit_id) AS reset_at;
    END IF;
  END IF;
END;
$$;