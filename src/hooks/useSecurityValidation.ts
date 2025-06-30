
// ABOUTME: Hook para validações de segurança centralizadas
// ABOUTME: Implementa verificações de autorização e logs de auditoria para operações sensíveis

import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface SecurityValidationResult {
  isValid: boolean;
  error?: string;
  userRole?: string;
}

export const useSecurityValidation = () => {
  const [isValidating, setIsValidating] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  // Validar se o usuário tem permissão para uma operação específica
  const validateUserPermission = async (
    requiredRole?: 'admin' | 'user',
    operation?: string
  ): Promise<SecurityValidationResult> => {
    if (!user) {
      console.warn('[SECURITY] Tentativa de operação sem autenticação:', operation);
      return { isValid: false, error: 'Usuário não autenticado' };
    }

    setIsValidating(true);
    try {
      // Buscar dados do perfil com validação de segurança
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('id, nome, role')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('[SECURITY] Erro ao validar permissões:', error);
        return { isValid: false, error: 'Erro ao validar permissões' };
      }

      if (!profile) {
        console.warn('[SECURITY] Perfil não encontrado para usuário:', user.id);
        return { isValid: false, error: 'Perfil não encontrado' };
      }

      // Verificar se o role é suficiente
      if (requiredRole === 'admin' && profile.role !== 'admin') {
        console.warn('[SECURITY] Acesso negado - role insuficiente:', {
          userId: user.id,
          userRole: profile.role,
          requiredRole,
          operation
        });
        return { 
          isValid: false, 
          error: 'Acesso negado - privilégios insuficientes',
          userRole: profile.role 
        };
      }

      // Log de operação autorizada
      console.log('[SECURITY] Operação autorizada:', {
        userId: user.id,
        userName: profile.nome,
        userRole: profile.role,
        operation,
        timestamp: new Date().toISOString()
      });

      return { isValid: true, userRole: profile.role };

    } catch (error) {
      console.error('[SECURITY] Erro inesperado na validação:', error);
      return { isValid: false, error: 'Erro inesperado na validação' };
    } finally {
      setIsValidating(false);
    }
  };

  // Registrar evento de segurança para auditoria
  const logSecurityEvent = async (
    eventType: 'unauthorized_access' | 'admin_action' | 'data_access' | 'profile_update',
    details: Record<string, any> = {}
  ) => {
    if (!user) return;

    try {
      const securityLog = {
        user_id: user.id,
        event_type: eventType,
        details: JSON.stringify(details),
        timestamp: new Date().toISOString(),
        ip_address: 'unknown', // Em produção, capturar IP real
        user_agent: navigator.userAgent
      };

      // Log local para debugging e auditoria
      console.log('[SECURITY AUDIT]', securityLog);

      // Salvar no localStorage para auditoria local
      const existingLogs = JSON.parse(localStorage.getItem('security_audit_logs') || '[]');
      existingLogs.push(securityLog);
      
      // Manter apenas os últimos 100 logs
      if (existingLogs.length > 100) {
        existingLogs.splice(0, existingLogs.length - 100);
      }
      
      localStorage.setItem('security_audit_logs', JSON.stringify(existingLogs));

    } catch (error) {
      console.error('[SECURITY] Erro ao registrar evento de auditoria:', error);
    }
  };

  // Validar dados de entrada para prevenir injeções
  const validateInput = (input: string, maxLength: number = 1000): boolean => {
    if (!input || typeof input !== 'string') return false;
    
    // Verificar comprimento
    if (input.length > maxLength) return false;
    
    // Verificar padrões suspeitos
    const suspiciousPatterns = [
      /<script/i,
      /javascript:/i,
      /on\w+\s*=/i,
      /eval\s*\(/i,
      /alert\s*\(/i,
      /document\./i,
      /window\./i
    ];
    
    return !suspiciousPatterns.some(pattern => pattern.test(input));
  };

  // Sanitizar entrada de texto
  const sanitizeInput = (input: string): string => {
    if (!input || typeof input !== 'string') return '';
    
    return input
      .replace(/[<>\"']/g, '') // Remove caracteres HTML perigosos
      .trim()
      .substring(0, 1000); // Limita comprimento
  };

  return {
    validateUserPermission,
    logSecurityEvent,
    validateInput,
    sanitizeInput,
    isValidating
  };
};
