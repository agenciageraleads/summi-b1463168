-- Corrigir as funções que ainda usam verify_admin_access

-- Atualizar audit_and_validate_role_change para usar is_admin
CREATE OR REPLACE FUNCTION public.audit_and_validate_role_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
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

  -- Prevent unauthorized role escalation usando is_admin
  IF OLD.role != NEW.role AND NOT is_admin(auth.uid()) THEN
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
$$;

-- Atualizar prevent_role_escalation para usar is_admin
CREATE OR REPLACE FUNCTION public.prevent_role_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Se o role está sendo alterado e o usuário não é admin
  IF OLD.role != NEW.role AND NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Apenas administradores podem alterar roles de usuário';
  END IF;
  
  RETURN NEW;
END;
$$;;
