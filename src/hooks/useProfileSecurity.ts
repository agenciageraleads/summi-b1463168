
// ABOUTME: Hook especializado para operações seguras de perfil
// ABOUTME: Implementa validações de segurança específicas para atualizações de perfil

import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useSecurityValidation } from './useSecurityValidation';
import type { Profile } from './useProfile';

export const useProfileSecurity = () => {
  const [isUpdating, setIsUpdating] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const { validateUserPermission, logSecurityEvent, sanitizeInput, validateInput } = useSecurityValidation();

  // Atualizar perfil com validações de segurança aprimoradas
  const secureUpdateProfile = async (updates: Partial<Profile>) => {
    if (!user) {
      toast({
        title: "Erro de Segurança",
        description: "Usuário não autenticado",
        variant: "destructive",
      });
      return { success: false, error: 'Usuário não autenticado' };
    }

    setIsUpdating(true);
    
    try {
      // Validar permissões
      const { isValid, error: permissionError } = await validateUserPermission('user', 'profile_update');
      if (!isValid) {
        await logSecurityEvent('unauthorized_access', {
          action: 'profile_update_denied',
          reason: permissionError,
          attemptedUpdates: Object.keys(updates)
        });
        
        toast({
          title: "Acesso Negado",
          description: permissionError || "Sem permissão para esta operação",
          variant: "destructive",
        });
        return { success: false, error: permissionError };
      }

      // Validar e sanitizar dados de entrada
      const sanitizedUpdates: any = {};
      const validationErrors: string[] = [];

      Object.entries(updates).forEach(([key, value]) => {
        if (value === undefined || value === null) return;

        switch (key) {
          case 'nome':
          case 'name':
            if (typeof value === 'string') {
              if (!validateInput(value, 100)) {
                validationErrors.push(`${key} contém caracteres inválidos ou é muito longo`);
              } else if (value.trim().length < 2) {
                validationErrors.push(`${key} deve ter pelo menos 2 caracteres`);
              } else {
                sanitizedUpdates[key] = sanitizeInput(value);
              }
            }
            break;

          case 'numero':
            if (typeof value === 'string') {
              const cleanPhone = value.replace(/\D/g, '');
              if (cleanPhone && !/^55[1-9][1-9][0-9]{8,9}$/.test(cleanPhone)) {
                validationErrors.push('Número de telefone inválido (formato brasileiro)');
              } else {
                sanitizedUpdates[key] = cleanPhone || null;
              }
            }
            break;

          case 'email':
            // Email não pode ser alterado por usuários comuns por segurança
            await logSecurityEvent('unauthorized_access', {
              action: 'email_change_attempt',
              userId: user.id,
              attemptedEmail: value
            });
            validationErrors.push('Alteração de email não permitida por segurança');
            break;

          case 'role':
            // Role só pode ser alterado por administradores
            const { isValid: isAdmin } = await validateUserPermission('admin', 'role_change');
            if (!isAdmin) {
              await logSecurityEvent('unauthorized_access', {
                action: 'role_escalation_attempt',
                userId: user.id,
                attemptedRole: value
              });
              validationErrors.push('Apenas administradores podem alterar roles');
            } else {
              sanitizedUpdates[key] = value;
            }
            break;

          case 'temas_importantes':
          case 'temas_urgentes':
            if (typeof value === 'string') {
              if (!validateInput(value, 500)) {
                validationErrors.push(`${key} contém caracteres inválidos ou é muito longo`);
              } else {
                sanitizedUpdates[key] = sanitizeInput(value);
              }
            }
            break;

          case 'instance_name':
            // instance_name só deve ser alterado pelo sistema
            if (typeof value === 'string' && value.length > 0) {
              if (!validateInput(value, 50) || !/^[a-z0-9_]+$/.test(value)) {
                validationErrors.push('Nome da instância inválido');
              } else {
                sanitizedUpdates[key] = value;
              }
            } else {
              sanitizedUpdates[key] = null;
            }
            break;

          default:
            // Outros campos booleanos e numéricos
            if (typeof value === 'boolean' || typeof value === 'number') {
              sanitizedUpdates[key] = value;
            }
            break;
        }
      });

      // Se há erros de validação, interromper
      if (validationErrors.length > 0) {
        await logSecurityEvent('data_access', {
          action: 'validation_failed',
          errors: validationErrors,
          attemptedUpdates: Object.keys(updates)
        });

        toast({
          title: "Erro de Validação",
          description: validationErrors.join(', '),
          variant: "destructive",
        });
        return { success: false, error: validationErrors.join(', ') };
      }

      // Verificar se há dados para atualizar
      if (Object.keys(sanitizedUpdates).length === 0) {
        return { success: true, message: 'Nenhuma alteração necessária' };
      }

      // Adicionar timestamp de atualização
      sanitizedUpdates.updated_at = new Date().toISOString();

      console.log('[PROFILE SECURITY] Atualizando perfil com dados sanitizados:', sanitizedUpdates);

      // Executar atualização no banco
      const { data, error } = await supabase
        .from('profiles')
        .update(sanitizedUpdates)
        .eq('id', user.id)
        .select()
        .single();

      if (error) {
        console.error('[PROFILE SECURITY] Erro no banco de dados:', error);
        
        await logSecurityEvent('data_access', {
          action: 'database_error',
          error: error.message,
          code: error.code
        });

        let errorMessage = "Erro ao atualizar perfil";
        if (error.code === '23505') {
          errorMessage = "Dados duplicados detectados";
        } else if (error.code === '23514') {
          errorMessage = "Dados não atendem aos critérios de segurança";
        }

        toast({
          title: "Erro",
          description: errorMessage,
          variant: "destructive",
        });
        return { success: false, error: error.message };
      }

      // Log de sucesso
      await logSecurityEvent('profile_update', {
        action: 'profile_updated_successfully',
        updatedFields: Object.keys(sanitizedUpdates),
        timestamp: new Date().toISOString()
      });

      toast({
        title: "Sucesso",
        description: "Perfil atualizado com segurança",
      });

      return { success: true, data };

    } catch (error) {
      console.error('[PROFILE SECURITY] Erro inesperado:', error);
      
      await logSecurityEvent('data_access', {
        action: 'unexpected_error',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });

      toast({
        title: "Erro",
        description: "Erro inesperado ao atualizar perfil",
        variant: "destructive",
      });
      return { success: false, error: 'Erro inesperado' };
    } finally {
      setIsUpdating(false);
    }
  };

  return {
    secureUpdateProfile,
    isUpdating
  };
};
