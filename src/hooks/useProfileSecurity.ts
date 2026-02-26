
// ABOUTME: Hook especializado para operações seguras de perfil
// ABOUTME: Implementa validações de segurança específicas para atualizações de perfil

import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useEnhancedSecurity } from './useEnhancedSecurity';
import type { Profile } from './useProfile';

export const useProfileSecurity = () => {
  const [isUpdating, setIsUpdating] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const { 
    logSecurityEvent, 
    checkRateLimit, 
    validateAdminAccess, 
    sanitizeInput, 
    validateInput, 
    detectSuspiciousActivity 
  } = useEnhancedSecurity();

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
      // SECURITY: Check rate limiting first
      const rateLimitOk = await checkRateLimit('profile_update', 20, 60);
      if (!rateLimitOk) {
        toast({
          title: "Muitas Tentativas",
          description: "Limite de atualizações excedido. Tente novamente em alguns minutos.",
          variant: "destructive",
        });
        return { success: false, error: 'Rate limit excedido' };
      }

      // Check for suspicious activity patterns
      await detectSuspiciousActivity();

      // Validar e sanitizar dados de entrada
      const sanitizedUpdates: any = {};
      const validationErrors: string[] = [];

      // CRITICAL SECURITY: Role change validation using enhanced security
      const validateRoleChange = async (value: any): Promise<boolean> => {
        const isAdmin = await validateAdminAccess('role_change');
        if (!isAdmin) {
          await logSecurityEvent('unauthorized_access', {
            action: 'role_escalation_attempt',
            userId: user.id,
            attemptedRole: value,
            blocked_reason: 'insufficient_admin_privileges'
          }, 'critical');
          return false;
        }
        return true;
      };

      // Processar cada campo de atualização
      for (const [key, value] of Object.entries(updates)) {
        if (value === undefined || value === null) continue;

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
            const canChangeRole = await validateRoleChange(value);
            if (!canChangeRole) {
              validationErrors.push('Apenas administradores podem alterar roles');
            } else {
              sanitizedUpdates[key] = value;
            }
            break;

          case 'temas_importantes':
          case 'temas_urgentes':
            if (typeof value === 'string') {
              const trimmed = value.trim();
              if (trimmed.length === 0) {
                sanitizedUpdates[key] = null;
                break;
              }
              if (!validateInput(trimmed, 500)) {
                validationErrors.push(`${key} contém caracteres inválidos ou é muito longo`);
              } else {
                sanitizedUpdates[key] = sanitizeInput(trimmed, 500);
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
      }

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
