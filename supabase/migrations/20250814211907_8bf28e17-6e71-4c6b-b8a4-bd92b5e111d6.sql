-- Criar função para notificar mudança de role
CREATE OR REPLACE FUNCTION public.notify_role_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  -- Log da mudança de role
  INSERT INTO public.security_audit_log (
    user_id, 
    event_type, 
    event_details, 
    severity
  ) VALUES (
    NEW.id,
    'role_change_webhook_update',
    jsonb_build_object(
      'old_role', OLD.role,
      'new_role', NEW.role,
      'instance_name', NEW.instance_name,
      'changed_by', auth.uid(),
      'timestamp', now()
    ),
    'medium'
  );
  
  -- Se o role mudou e o usuário tem instance_name, atualizar webhook
  IF OLD.role != NEW.role AND NEW.instance_name IS NOT NULL THEN
    -- Fazer chamada HTTP para atualizar webhook (será implementado via edge function)
    PERFORM pg_notify('role_change_webhook', json_build_object(
      'user_id', NEW.id,
      'old_role', OLD.role,
      'new_role', NEW.role,
      'instance_name', NEW.instance_name
    )::text);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Criar trigger para capturar mudanças de role
CREATE TRIGGER role_change_webhook_trigger
  AFTER UPDATE OF role ON public.profiles
  FOR EACH ROW
  WHEN (OLD.role IS DISTINCT FROM NEW.role)
  EXECUTE FUNCTION public.notify_role_change();