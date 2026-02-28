-- CRITICAL SECURITY FIXES: Phase 1 - Database Security

-- Fix 1: Enable RLS on tables that have policies but RLS disabled
-- (Based on linter error "Policy Exists RLS Disabled")
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Fix 2: Add missing RLS policies for tables with RLS enabled but no policies
-- Create policies for leads table (assuming it should be admin-only or user-specific)
CREATE POLICY "leads_admin_access" ON public.leads
  FOR ALL USING (verify_admin_access(auth.uid()));

-- Fix 3: Secure all database functions with proper search_path
-- Update existing functions to prevent SQL injection
CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO ''
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = user_id AND role = 'admin'
  );
$function$;

CREATE OR REPLACE FUNCTION public.validate_brazilian_phone(phone_number text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  -- Remove todos os caracteres não numéricos
  phone_number := regexp_replace(phone_number, '[^0-9]', '', 'g');
  
  -- Verifica formato brasileiro: 55 + DDD (2 dígitos) + número (8-9 dígitos)
  RETURN phone_number ~ '^55[1-9][1-9][0-9]{8,9}$';
END;
$function$;

-- Fix 4: Create audit table for security events and role changes
CREATE TABLE IF NOT EXISTS public.security_audit_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  event_details jsonb DEFAULT '{}',
  ip_address inet,
  user_agent text,
  session_id text,
  severity text CHECK (severity IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on audit log
ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "security_audit_log_admin_view" ON public.security_audit_log
  FOR SELECT USING (verify_admin_access(auth.uid()));

-- Service role can insert audit logs
CREATE POLICY "security_audit_log_service_insert" ON public.security_audit_log
  FOR INSERT WITH CHECK (true);

-- Fix 5: Create enhanced role change validation trigger
CREATE OR REPLACE FUNCTION public.audit_and_validate_role_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  -- Log all role change attempts
  INSERT INTO public.security_audit_log (
    user_id, 
    event_type, 
    event_details, 
    severity
  ) VALUES (
    NEW.id,
    'role_change_attempt',
    jsonb_build_object(
      'old_role', OLD.role,
      'new_role', NEW.role,
      'changed_by', auth.uid(),
      'timestamp', now()
    ),
    CASE 
      WHEN NEW.role = 'admin' THEN 'critical'
      ELSE 'high'
    END
  );

  -- Prevent unauthorized role escalation
  IF OLD.role != NEW.role AND NOT verify_admin_access(auth.uid()) THEN
    -- Log security violation
    INSERT INTO public.security_audit_log (
      user_id, 
      event_type, 
      event_details, 
      severity
    ) VALUES (
      NEW.id,
      'unauthorized_role_escalation',
      jsonb_build_object(
        'attempted_role', NEW.role,
        'current_role', OLD.role,
        'blocked_by', 'security_trigger'
      ),
      'critical'
    );
    
    RAISE EXCEPTION 'Acesso negado: Apenas administradores podem alterar roles de usuário';
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create the trigger
DROP TRIGGER IF EXISTS audit_role_changes ON public.profiles;
CREATE TRIGGER audit_role_changes
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  WHEN (OLD.role IS DISTINCT FROM NEW.role)
  EXECUTE FUNCTION public.audit_and_validate_role_change();

-- Fix 6: Add rate limiting table for admin operations
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  operation_type text NOT NULL,
  attempts integer NOT NULL DEFAULT 1,
  last_attempt timestamp with time zone NOT NULL DEFAULT now(),
  reset_at timestamp with time zone NOT NULL DEFAULT (now() + interval '1 hour'),
  UNIQUE(user_id, operation_type)
);

-- Enable RLS on rate limits
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Only the user themselves and admins can view rate limits
CREATE POLICY "rate_limits_own_view" ON public.rate_limits
  FOR SELECT USING (auth.uid() = user_id OR verify_admin_access(auth.uid()));

-- Users can update their own rate limits, admins can update any
CREATE POLICY "rate_limits_own_update" ON public.rate_limits
  FOR ALL USING (auth.uid() = user_id OR verify_admin_access(auth.uid()))
  WITH CHECK (auth.uid() = user_id OR verify_admin_access(auth.uid()));

-- Fix 7: Create function to check and enforce rate limits
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  _user_id uuid,
  _operation_type text,
  _max_attempts integer DEFAULT 10,
  _window_minutes integer DEFAULT 60
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  current_attempts integer;
  reset_time timestamp with time zone;
BEGIN
  -- Get current attempts within the window
  SELECT attempts, reset_at INTO current_attempts, reset_time
  FROM public.rate_limits
  WHERE user_id = _user_id 
    AND operation_type = _operation_type
    AND reset_at > now();
  
  -- If no record exists or window expired, create/reset
  IF current_attempts IS NULL THEN
    INSERT INTO public.rate_limits (user_id, operation_type, attempts, reset_at)
    VALUES (_user_id, _operation_type, 1, now() + (_window_minutes || ' minutes')::interval)
    ON CONFLICT (user_id, operation_type) 
    DO UPDATE SET 
      attempts = 1,
      last_attempt = now(),
      reset_at = now() + (_window_minutes || ' minutes')::interval;
    
    RETURN true;
  END IF;
  
  -- Check if limit exceeded
  IF current_attempts >= _max_attempts THEN
    -- Log rate limit violation
    INSERT INTO public.security_audit_log (
      user_id, 
      event_type, 
      event_details, 
      severity
    ) VALUES (
      _user_id,
      'rate_limit_exceeded',
      jsonb_build_object(
        'operation_type', _operation_type,
        'attempts', current_attempts,
        'max_attempts', _max_attempts
      ),
      'medium'
    );
    
    RETURN false;
  END IF;
  
  -- Increment attempts
  UPDATE public.rate_limits 
  SET attempts = attempts + 1, last_attempt = now()
  WHERE user_id = _user_id AND operation_type = _operation_type;
  
  RETURN true;
END;
$function$;;
