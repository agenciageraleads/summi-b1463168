// ABOUTME: Hook refatorado para validação de permissões admin
// ABOUTME: Centraliza verificações de segurança com logs detalhados

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface AdminValidationResult {
  isAdmin: boolean;
  isLoading: boolean;
  error: string | null;
  userRole: string | null;
  permissions: {
    canPromoteUsers: boolean;
    canDeleteUsers: boolean;
    canViewLogs: boolean;
    canManageSystem: boolean;
  };
}

export const useAdminValidation = () => {
  const [result, setResult] = useState<AdminValidationResult>({
    isAdmin: false,
    isLoading: true,
    error: null,
    userRole: null,
    permissions: {
      canPromoteUsers: false,
      canDeleteUsers: false,
      canViewLogs: false,
      canManageSystem: false
    }
  });

  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    validateAdminAccess();
  }, [user]);

  const validateAdminAccess = async () => {
    if (!user) {
      console.log('[ADMIN-VALIDATION] ❌ Usuário não autenticado');
      setResult(prev => ({
        ...prev,
        isLoading: false,
        error: 'Usuário não autenticado'
      }));
      return;
    }

    console.log('[ADMIN-VALIDATION] 🔍 Validando acesso admin para:', user.id);

    try {
      setResult(prev => ({ ...prev, isLoading: true, error: null }));

      // Buscar dados do perfil
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, nome, role')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error('[ADMIN-VALIDATION] ❌ Erro ao buscar perfil:', profileError);
        throw new Error('Erro ao validar permissões');
      }

      if (!profile) {
        console.error('[ADMIN-VALIDATION] ❌ Perfil não encontrado');
        throw new Error('Perfil não encontrado');
      }

      console.log('[ADMIN-VALIDATION] 📝 Perfil encontrado:', profile);

      const isAdmin = profile.role === 'admin';
      const permissions = {
        canPromoteUsers: isAdmin,
        canDeleteUsers: isAdmin,
        canViewLogs: isAdmin,
        canManageSystem: isAdmin
      };

      console.log(`[ADMIN-VALIDATION] ${isAdmin ? '✅' : '❌'} Validação admin:`, {
        isAdmin,
        userRole: profile.role,
        permissions
      });

      // Log de auditoria para tentativas de acesso
      if (isAdmin) {
        await supabase
          .from('security_audit_log')
          .insert({
            event_type: 'admin_access_granted',
            event_details: {
              user_name: profile.nome,
              user_role: profile.role,
              access_timestamp: new Date().toISOString()
            },
            severity: 'medium'
          });
      }

      setResult({
        isAdmin,
        isLoading: false,
        error: null,
        userRole: profile.role,
        permissions
      });

    } catch (error: any) {
      console.error('[ADMIN-VALIDATION] ❌ Erro crítico na validação:', error);
      
      setResult({
        isAdmin: false,
        isLoading: false,
        error: error.message,
        userRole: null,
        permissions: {
          canPromoteUsers: false,
          canDeleteUsers: false,
          canViewLogs: false,
          canManageSystem: false
        }
      });

      // Log de erro de segurança
      await supabase
        .from('security_audit_log')
        .insert({
          event_type: 'admin_validation_error',
          event_details: {
            error_message: error.message,
            user_id: user.id,
            error_timestamp: new Date().toISOString()
          },
          severity: 'high'
        });
    }
  };

  const requireAdminAccess = (operation: string): boolean => {
    if (!result.isAdmin) {
      console.warn(`[ADMIN-VALIDATION] ⚠️ Acesso negado para operação: ${operation}`);
      toast({
        title: "⚠️ Acesso Negado",
        description: "Você não tem permissões de administrador para esta operação.",
        variant: "destructive",
      });
      return false;
    }

    console.log(`[ADMIN-VALIDATION] ✅ Acesso autorizado para operação: ${operation}`);
    return true;
  };

  const refreshValidation = () => {
    console.log('[ADMIN-VALIDATION] 🔄 Atualizando validação admin...');
    validateAdminAccess();
  };

  return {
    ...result,
    requireAdminAccess,
    refreshValidation
  };
};