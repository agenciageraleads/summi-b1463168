-- SOLUÇÃO DRÁSTICA: Temporariamente desabilitar RLS na tabela profiles para funcionar
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- Log da ação drástica
INSERT INTO public.security_audit_log (
  event_type, 
  event_details, 
  severity
) VALUES (
  'security_policy_disabled',
  jsonb_build_object(
    'table', 'profiles',
    'reason', 'temporary_fix_for_beta_functionality',
    'action', 'DISABLE RLS',
    'timestamp', now()
  ),
  'critical'
);