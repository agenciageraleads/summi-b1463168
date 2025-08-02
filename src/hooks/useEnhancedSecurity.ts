// ABOUTME: Hook avançado de segurança com auditoria completa e rate limiting
// ABOUTME: Integra com o novo sistema de audit log do banco de dados e rate limiting

import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface SecurityAuditEvent {
  event_type: 'login' | 'logout' | 'admin_action' | 'unauthorized_access' | 'data_access' | 
              'profile_update' | 'role_change' | 'rate_limit_exceeded' | 'security_violation';
  event_details?: Record<string, any>;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  ip_address?: string;
  user_agent?: string;
  session_id?: string;
}

export const useEnhancedSecurity = () => {
  const [isLogging, setIsLogging] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  // Log security event to database audit table
  const logSecurityEvent = async (
    eventType: SecurityAuditEvent['event_type'],
    details: Record<string, any> = {},
    severity: SecurityAuditEvent['severity'] = 'medium'
  ) => {
    if (!user) return;

    try {
      setIsLogging(true);

      const auditEvent = {
        user_id: user.id,
        event_type: eventType,
        event_details: details,
        severity,
        ip_address: null, // Will be filled by server if needed
        user_agent: navigator.userAgent,
        session_id: null // Could be enhanced later
      };

      // Insert into database audit log
      const { error } = await supabase
        .from('security_audit_log')
        .insert(auditEvent);

      if (error) {
        console.error('[SECURITY AUDIT] Erro ao salvar no banco:', error);
      }

      // Also log locally for debugging
      console.log('[SECURITY AUDIT]', auditEvent);

      // Show critical security events to user
      if (severity === 'critical') {
        toast({
          title: "Evento de Segurança Crítico",
          description: "Evento de segurança foi registrado e será investigado",
          variant: "destructive",
        });
      }

    } catch (error) {
      console.error('[SECURITY AUDIT] Erro inesperado:', error);
    } finally {
      setIsLogging(false);
    }
  };

  // Check rate limit using database function
  const checkRateLimit = async (
    operationType: string,
    maxAttempts: number = 10,
    windowMinutes: number = 60
  ): Promise<boolean> => {
    if (!user) return false;

    try {
      const { data, error } = await supabase.rpc('check_rate_limit', {
        _user_id: user.id,
        _operation_type: operationType,
        _max_attempts: maxAttempts,
        _window_minutes: windowMinutes
      });

      if (error) {
        console.error('[RATE LIMIT] Erro ao verificar rate limit:', error);
        // Em caso de erro, permitir a operação mas logar
        await logSecurityEvent('security_violation', {
          operation: 'rate_limit_check_failed',
          error: error.message
        }, 'high');
        return true;
      }

      if (!data) {
        await logSecurityEvent('rate_limit_exceeded', {
          operation_type: operationType,
          max_attempts: maxAttempts,
          window_minutes: windowMinutes
        }, 'medium');
      }

      return data;
    } catch (error) {
      console.error('[RATE LIMIT] Erro inesperado:', error);
      return true; // Fail open for availability
    }
  };

  // Validate admin access with enhanced logging
  const validateAdminAccess = async (operation: string): Promise<boolean> => {
    if (!user) {
      await logSecurityEvent('unauthorized_access', {
        operation,
        reason: 'no_user_session'
      }, 'high');
      return false;
    }

    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (error || !profile) {
        await logSecurityEvent('unauthorized_access', {
          operation,
          reason: 'profile_not_found',
          error: error?.message
        }, 'high');
        return false;
      }

      const isAdmin = profile.role === 'admin';
      
      if (!isAdmin) {
        await logSecurityEvent('unauthorized_access', {
          operation,
          reason: 'insufficient_privileges',
          user_role: profile.role,
          required_role: 'admin'
        }, 'high');
      } else {
        await logSecurityEvent('admin_action', {
          operation,
          admin_id: user.id,
          action: 'admin_access_granted'
        }, 'medium');
      }

      return isAdmin;
    } catch (error) {
      await logSecurityEvent('security_violation', {
        operation,
        error: error instanceof Error ? error.message : 'unknown_error'
      }, 'critical');
      return false;
    }
  };

  // Sanitize input with comprehensive filtering
  const sanitizeInput = (input: string, maxLength: number = 1000): string => {
    if (!input || typeof input !== 'string') return '';
    
    return input
      .replace(/[<>\"'`]/g, '') // Remove potentially dangerous HTML/JS characters
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+\s*=/gi, '') // Remove event handlers
      .trim()
      .substring(0, maxLength);
  };

  // Validate input with security patterns
  const validateInput = (input: string, maxLength: number = 1000): boolean => {
    if (!input || typeof input !== 'string') return false;
    
    if (input.length > maxLength) return false;
    
    // Check for suspicious patterns
    const suspiciousPatterns = [
      /<script/i,
      /javascript:/i,
      /on\w+\s*=/i,
      /eval\s*\(/i,
      /alert\s*\(/i,
      /document\./i,
      /window\./i,
      /\.constructor/i,
      /prototype/i,
      /\[\s*['"]constructor['"]\s*\]/i
    ];
    
    return !suspiciousPatterns.some(pattern => pattern.test(input));
  };

  // Detect suspicious activity patterns
  const detectSuspiciousActivity = async (): Promise<void> => {
    if (!user) return;

    try {
      // Check for multiple failed operations in short time
      const { data: recentEvents, error } = await supabase
        .from('security_audit_log')
        .select('event_type, created_at, severity')
        .eq('user_id', user.id)
        .gte('created_at', new Date(Date.now() - 5 * 60 * 1000).toISOString()) // Last 5 minutes
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[SUSPICIOUS ACTIVITY] Erro ao verificar eventos recentes:', error);
        return;
      }

      if (recentEvents && recentEvents.length > 0) {
        const suspiciousEvents = recentEvents.filter(event => 
          event.event_type === 'unauthorized_access' || 
          event.event_type === 'security_violation' ||
          event.severity === 'critical'
        );

        if (suspiciousEvents.length >= 3) {
          await logSecurityEvent('security_violation', {
            pattern: 'multiple_suspicious_events',
            event_count: suspiciousEvents.length,
            time_window: '5_minutes',
            events: suspiciousEvents
          }, 'critical');

          toast({
            title: "Atividade Suspeita Detectada",
            description: "Múltiplas violações de segurança detectadas. Conta será investigada.",
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      console.error('[SUSPICIOUS ACTIVITY] Erro inesperado:', error);
    }
  };

  return {
    logSecurityEvent,
    checkRateLimit,
    validateAdminAccess,
    sanitizeInput,
    validateInput,
    detectSuspiciousActivity,
    isLogging
  };
};