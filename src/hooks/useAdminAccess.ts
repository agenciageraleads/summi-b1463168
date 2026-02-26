// ABOUTME: Hook unificado para validação de acesso administrativo
// ABOUTME: Substitui useAdmin, useAdminValidation e outras validações fragmentadas

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface AdminAccessResult {
  isAdmin: boolean;
  isLoading: boolean;
  error: string | null;
  userRole: string | null;
  refresh: () => void;
  requireAdminAccess: (operation: string) => boolean;
}

export const useAdminAccess = (): AdminAccessResult => {
  const [state, setState] = useState<Omit<AdminAccessResult, 'refresh' | 'requireAdminAccess'>>({
    isAdmin: false,
    isLoading: true,
    error: null,
    userRole: null
  });

  const { user } = useAuth();
  const { toast } = useToast();

  const validateAdminAccess = async () => {
    if (!user) {
      console.log('[ADMIN-ACCESS] ❌ Usuário não autenticado');
      setState(prev => ({
        ...prev,
        isAdmin: false,
        isLoading: false,
        error: 'Usuário não autenticado',
        userRole: null
      }));
      return;
    }

    console.log('[ADMIN-ACCESS] 🔍 Validando acesso admin para:', user.id);

    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      // Query direta sem dependência de funções SQL
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, nome, role')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error('[ADMIN-ACCESS] ❌ Erro ao buscar perfil:', profileError);
        throw new Error('Erro ao validar permissões de acesso');
      }

      if (!profile) {
        console.error('[ADMIN-ACCESS] ❌ Perfil não encontrado');
        throw new Error('Perfil de usuário não encontrado');
      }

      const roleIsAdmin = profile.role === 'admin';

      // Se existir allowlist, exige que o usuário esteja nela (evita admins indevidos por role)
      let allowlistConfigured = false;
      let allowlistIsAdmin: boolean | null = null;
      try {
        const { data: verifyData, error: verifyError } = await supabase.functions.invoke('admin-verify');
        if (!verifyError && verifyData && typeof verifyData === 'object') {
          allowlistConfigured = Boolean((verifyData as any).allowlist_configured);
          const maybe = (verifyData as any).is_admin;
          allowlistIsAdmin = typeof maybe === 'boolean' ? maybe : null;
        }
      } catch {
        // Falha silenciosa: mantém fallback pelo role (compatibilidade)
      }

      const isAdmin = allowlistConfigured && allowlistIsAdmin !== null ? roleIsAdmin && allowlistIsAdmin : roleIsAdmin;
      
      console.log(`[ADMIN-ACCESS] ${isAdmin ? '✅' : '❌'} Validação admin:`, {
        isAdmin,
        userRole: profile.role,
        userName: profile.nome
      });

      // Log de auditoria para acessos admin
      if (isAdmin) {
        await supabase
          .from('security_audit_log')
          .insert({
            event_type: 'admin_access_validated',
            event_details: {
              user_name: profile.nome,
              user_role: profile.role,
              validation_timestamp: new Date().toISOString()
            },
            severity: 'medium'
          });
      }

      setState(prev => ({
        ...prev,
        isAdmin,
        isLoading: false,
        error: null,
        userRole: profile.role
      }));

    } catch (error: any) {
      console.error('[ADMIN-ACCESS] ❌ Erro na validação:', error);
      
      setState(prev => ({
        ...prev,
        isAdmin: false,
        isLoading: false,
        error: error.message,
        userRole: null
      }));

      // Log de erro de segurança
      await supabase
        .from('security_audit_log')
        .insert({
          event_type: 'admin_access_error',
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
    if (!state.isAdmin) {
      console.warn(`[ADMIN-ACCESS] ⚠️ Acesso negado para operação: ${operation}`);
      toast({
        title: "⚠️ Acesso Negado",
        description: "Você não tem permissões administrativas para esta operação.",
        variant: "destructive",
      });
      return false;
    }

    console.log(`[ADMIN-ACCESS] ✅ Operação autorizada: ${operation}`);
    return true;
  };

  const refresh = () => {
    console.log('[ADMIN-ACCESS] 🔄 Atualizando validação...');
    validateAdminAccess();
  };

  useEffect(() => {
    validateAdminAccess();
  }, [user]);

  return {
    ...state,
    refresh,
    requireAdminAccess
  };
};
