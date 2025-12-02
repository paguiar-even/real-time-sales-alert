-- Drop the old version of admin_create_user (5 parameters)
DROP FUNCTION IF EXISTS public.admin_create_user(text, text, text, text, boolean);

-- Keep only the version with 6 parameters (including assign_admin)