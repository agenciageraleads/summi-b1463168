
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface SecurityEvent {
  id: string;
  user_id: string;
  event_type: 'login' | 'logout' | 'profile_update' | 'password_change' | 'admin_action';
  details: Record<string, any>;
  timestamp: string;
  ip_address?: string;
}

export const useSecurityAudit = () => {
  const [isLogging, setIsLogging] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  // Função para registrar eventos de segurança
  const logSecurityEvent = async (
    eventType: SecurityEvent['event_type'],
    details: Record<string, any> = {}
  ) => {
    if (!user) return;

    setIsLogging(true);
    try {
      console.log('[SECURITY] Registrando evento:', {
        user_id: user.id,
        event_type: eventType,
        details,
        timestamp: new Date().toISOString()
      });

      // Log local para debugging
      const securityLog = {
        user_id: user.id,
        event_type: eventType,
        details: JSON.stringify(details),
        timestamp: new Date().toISOString()
      };

      // Salvar no localStorage para auditoria local
      const existingLogs = JSON.parse(localStorage.getItem('security_logs') || '[]');
      existingLogs.push(securityLog);
      
      // Manter apenas os últimos 50 logs
      if (existingLogs.length > 50) {
        existingLogs.splice(0, existingLogs.length - 50);
      }
      
      localStorage.setItem('security_logs', JSON.stringify(existingLogs));

    } catch (error) {
      console.error('[SECURITY] Erro ao registrar evento:', error);
    } finally {
      setIsLogging(false);
    }
  };

  // Função para validar tokens de acesso
  const validateAccess = async (requiredRole?: string) => {
    if (!user) {
      logSecurityEvent('admin_action', { 
        action: 'access_denied', 
        reason: 'no_user' 
      });
      return false;
    }

    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (error) {
        logSecurityEvent('admin_action', { 
          action: 'access_validation_error', 
          error: error.message 
        });
        return false;
      }

      if (requiredRole && profile?.role !== requiredRole) {
        logSecurityEvent('admin_action', { 
          action: 'access_denied', 
          reason: 'insufficient_role',
          user_role: profile?.role,
          required_role: requiredRole
        });
        return false;
      }

      return true;
    } catch (error) {
      console.error('[SECURITY] Erro na validação de acesso:', error);
      logSecurityEvent('admin_action', { 
        action: 'access_validation_error', 
        error: 'unexpected_error' 
      });
      return false;
    }
  };

  return {
    logSecurityEvent,
    validateAccess,
    isLogging
  };
};
