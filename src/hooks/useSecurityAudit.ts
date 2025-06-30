
// ABOUTME: Hook para auditoria de segurança com melhorias e validações aprimoradas
// ABOUTME: Registra eventos de segurança críticos e valida acessos administrativos

import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface SecurityEvent {
  id: string;
  user_id: string;
  event_type: 'login' | 'logout' | 'profile_update' | 'password_change' | 'admin_action' | 'unauthorized_access' | 'data_access';
  details: Record<string, any>;
  timestamp: string;
  ip_address?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export const useSecurityAudit = () => {
  const [isLogging, setIsLogging] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  // Função para registrar eventos de segurança com severidade
  const logSecurityEvent = async (
    eventType: SecurityEvent['event_type'],
    details: Record<string, any> = {},
    severity: SecurityEvent['severity'] = 'medium'
  ) => {
    if (!user) return;

    setIsLogging(true);
    try {
      const securityLog = {
        user_id: user.id,
        event_type: eventType,
        details: JSON.stringify(details),
        timestamp: new Date().toISOString(),
        severity,
        user_agent: navigator.userAgent,
        url: window.location.href
      };

      console.log(`[SECURITY AUDIT - ${severity.toUpperCase()}]`, securityLog);

      // Salvar no localStorage para auditoria local
      const existingLogs = JSON.parse(localStorage.getItem('security_audit_logs') || '[]');
      existingLogs.push(securityLog);
      
      // Manter apenas os últimos 100 logs
      if (existingLogs.length > 100) {
        existingLogs.splice(0, existingLogs.length - 100);
      }
      
      localStorage.setItem('security_audit_logs', JSON.stringify(existingLogs));

      // Para eventos críticos, mostrar alerta
      if (severity === 'critical') {
        console.error('[CRITICAL SECURITY EVENT]', securityLog);
        toast({
          title: "Evento de Segurança Crítico",
          description: "Um evento de segurança crítico foi detectado e registrado.",
          variant: "destructive",
        });
      }

    } catch (error) {
      console.error('[SECURITY] Erro ao registrar evento de auditoria:', error);
    } finally {
      setIsLogging(false);
    }
  };

  // Função para validar tokens de acesso com logs de auditoria
  const validateAccess = async (requiredRole?: string, operation?: string) => {
    if (!user) {
      await logSecurityEvent('unauthorized_access', { 
        action: 'access_denied', 
        reason: 'no_user',
        operation 
      }, 'high');
      return false;
    }

    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('id, nome, role')
        .eq('id', user.id)
        .single();

      if (error) {
        await logSecurityEvent('admin_action', { 
          action: 'access_validation_error', 
          error: error.message,
          operation 
        }, 'high');
        return false;
      }

      if (requiredRole && profile?.role !== requiredRole) {
        await logSecurityEvent('unauthorized_access', { 
          action: 'access_denied', 
          reason: 'insufficient_role',
          user_role: profile?.role,
          required_role: requiredRole,
          operation
        }, 'high');
        return false;
      }

      // Log de acesso autorizado
      await logSecurityEvent('admin_action', {
        action: 'access_granted',
        user_role: profile?.role,
        operation,
        timestamp: new Date().toISOString()
      }, 'low');

      return true;
    } catch (error) {
      console.error('[SECURITY] Erro na validação de acesso:', error);
      await logSecurityEvent('admin_action', { 
        action: 'access_validation_error', 
        error: 'unexpected_error',
        operation 
      }, 'critical');
      return false;
    }
  };

  // Função para verificar padrões suspeitos de acesso
  const detectSuspiciousActivity = async () => {
    try {
      const logs = JSON.parse(localStorage.getItem('security_audit_logs') || '[]');
      const recentLogs = logs.filter((log: any) => {
        const logTime = new Date(log.timestamp);
        const now = new Date();
        return (now.getTime() - logTime.getTime()) < (60 * 60 * 1000); // Última hora
      });

      // Detectar múltiplas tentativas de acesso negado
      const deniedAttempts = recentLogs.filter((log: any) => 
        log.event_type === 'unauthorized_access'
      );

      if (deniedAttempts.length >= 5) {
        await logSecurityEvent('unauthorized_access', {
          action: 'suspicious_activity_detected',
          denied_attempts_count: deniedAttempts.length,
          timeframe: '1_hour'
        }, 'critical');

        toast({
          title: "Atividade Suspeita Detectada",
          description: "Múltiplas tentativas de acesso não autorizado foram detectadas.",
          variant: "destructive",
        });
      }

    } catch (error) {
      console.error('[SECURITY] Erro ao detectar atividade suspeita:', error);
    }
  };

  // Função para limpar logs antigos (manutenção)
  const cleanupOldLogs = () => {
    try {
      const logs = JSON.parse(localStorage.getItem('security_audit_logs') || '[]');
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 30); // Manter logs dos últimos 30 dias
      
      const recentLogs = logs.filter((log: any) => {
        const logDate = new Date(log.timestamp);
        return logDate > cutoffDate;
      });
      
      localStorage.setItem('security_audit_logs', JSON.stringify(recentLogs));
      console.log('[SECURITY] Logs antigos limpos, mantidos:', recentLogs.length);
      
    } catch (error) {
      console.error('[SECURITY] Erro ao limpar logs antigos:', error);
    }
  };

  return {
    logSecurityEvent,
    validateAccess,
    detectSuspiciousActivity,
    cleanupOldLogs,
    isLogging
  };
};
