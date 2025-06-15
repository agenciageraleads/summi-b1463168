
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// Interface do perfil com validações de segurança e novos campos
export interface Profile {
  id: string;
  nome: string;
  email?: string;
  numero?: string;
  instance_name?: string;
  temas_importantes?: string;
  temas_urgentes?: string;
  transcreve_audio_recebido?: boolean;
  transcreve_audio_enviado?: boolean;
  resume_audio?: boolean;
  segundos_para_resumir?: number;
  'Summi em Audio?'?: boolean; // Novo campo
  apenas_horario_comercial?: boolean; // Novo campo
}

// Função para validar número de telefone brasileiro
const validatePhoneNumber = (phone: string): boolean => {
  if (!phone) return true; // Campo opcional
  const cleanPhone = phone.replace(/\D/g, '');
  return /^55[1-9][1-9][0-9]{8,9}$/.test(cleanPhone);
};

// Função para sanitizar entrada de texto
const sanitizeText = (text: string): string => {
  if (!text) return '';
  return text.replace(/[<>\"']/g, '').trim();
};

// Função para validar email
const validateEmail = (email: string): boolean => {
  if (!email) return false;
  const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
  return emailRegex.test(email);
};

export const useProfile = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Função para buscar o perfil com validação de segurança
  const fetchProfile = async () => {
    if (!user) {
      setProfile(null);
      setIsLoading(false);
      return;
    }

    try {
      console.log('[PROFILE] Fetching profile for user:', user.id);
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('[PROFILE] Erro ao buscar perfil:', error);
        
        // Se perfil não existe, pode ser um usuário novo
        if (error.code === 'PGRST116') {
          console.log('[PROFILE] Profile not found, user may be new');
          toast({
            title: "Perfil não encontrado",
            description: "Criando perfil automaticamente...",
            variant: "destructive",
          });
        }
        return;
      }

      // Validar dados do perfil antes de definir no estado
      if (data.numero && !validatePhoneNumber(data.numero)) {
        console.warn('[PROFILE] Invalid phone number detected');
        toast({
          title: "Aviso",
          description: "Número de telefone inválido detectado. Por favor, corrija.",
          variant: "destructive",
        });
      }

      if (data.email && !validateEmail(data.email)) {
        console.warn('[PROFILE] Invalid email detected');
      }

      setProfile(data);
      console.log('[PROFILE] Profile loaded successfully:', data);
      
    } catch (error) {
      console.error('[PROFILE] Erro inesperado ao buscar perfil:', error);
      toast({
        title: "Erro",
        description: "Erro inesperado ao carregar perfil",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Função para atualizar o perfil com validações de segurança
  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) {
      console.error('[PROFILE] No user found for update');
      return { success: false, error: 'Usuário não autenticado' };
    }

    try {
      console.log('[PROFILE] Starting profile update for user:', user.id);
      console.log('[PROFILE] Updates received:', updates);

      // Validações de entrada
      if (updates.numero && !validatePhoneNumber(updates.numero)) {
        toast({
          title: "Erro de validação",
          description: "Número de telefone deve seguir o formato brasileiro (55 + DDD + número)",
          variant: "destructive",
        });
        return { success: false, error: 'Número de telefone inválido' };
      }

      if (updates.email && !validateEmail(updates.email)) {
        toast({
          title: "Erro de validação", 
          description: "Formato de email inválido",
          variant: "destructive",
        });
        return { success: false, error: 'Email inválido' };
      }

      // Sanitizar campos de texto
      const sanitizedUpdates = {
        ...updates,
        nome: updates.nome ? sanitizeText(updates.nome) : updates.nome,
        temas_importantes: updates.temas_importantes ? sanitizeText(updates.temas_importantes) : updates.temas_importantes,
        temas_urgentes: updates.temas_urgentes ? sanitizeText(updates.temas_urgentes) : updates.temas_urgentes,
      };

      // Validar que nome não está vazio após sanitização
      if (sanitizedUpdates.nome !== undefined && sanitizedUpdates.nome.length < 2) {
        toast({
          title: "Erro de validação",
          description: "Nome deve ter pelo menos 2 caracteres",
          variant: "destructive",
        });
        return { success: false, error: 'Nome muito curto' };
      }

      // Verificar se o email está sendo alterado (não permitido por usuários comuns)
      if (updates.email && profile?.email && updates.email !== profile.email) {
        console.warn('[PROFILE] Attempt to change email detected');
        toast({
          title: "Erro",
          description: "Alteração de email não permitida. Contate o suporte.",
          variant: "destructive",
        });
        return { success: false, error: 'Alteração de email não permitida' };
      }

      // Preparar objeto limpo para atualização, incluindo apenas campos definidos
      const updateData: any = {
        updated_at: new Date().toISOString()
      };

      // Adicionar apenas campos que não são undefined
      if (sanitizedUpdates.nome !== undefined) updateData.nome = sanitizedUpdates.nome;
      if (sanitizedUpdates.numero !== undefined) updateData.numero = sanitizedUpdates.numero;
      if (sanitizedUpdates.temas_importantes !== undefined) updateData.temas_importantes = sanitizedUpdates.temas_importantes;
      if (sanitizedUpdates.temas_urgentes !== undefined) updateData.temas_urgentes = sanitizedUpdates.temas_urgentes;
      if (sanitizedUpdates.transcreve_audio_recebido !== undefined) updateData.transcreve_audio_recebido = sanitizedUpdates.transcreve_audio_recebido;
      if (sanitizedUpdates.transcreve_audio_enviado !== undefined) updateData.transcreve_audio_enviado = sanitizedUpdates.transcreve_audio_enviado;
      if (sanitizedUpdates.resume_audio !== undefined) updateData.resume_audio = sanitizedUpdates.resume_audio;
      if (sanitizedUpdates.segundos_para_resumir !== undefined) updateData.segundos_para_resumir = sanitizedUpdates.segundos_para_resumir;
      if (sanitizedUpdates['Summi em Audio?'] !== undefined) updateData['Summi em Audio?'] = sanitizedUpdates['Summi em Audio?'];
      if (sanitizedUpdates.apenas_horario_comercial !== undefined) updateData.apenas_horario_comercial = sanitizedUpdates.apenas_horario_comercial;

      console.log('[PROFILE] Final update data being sent to database:', updateData);

      // Verificar se há sessão ativa antes de tentar atualizar
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.error('[PROFILE] No active session found');
        toast({
          title: "Erro de autenticação",
          description: "Sessão expirada. Faça login novamente.",
          variant: "destructive",
        });
        return { success: false, error: 'Sessão expirada' };
      }

      console.log('[PROFILE] Session active, proceeding with update...');

      const { data, error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', user.id)
        .select()
        .single();

      if (error) {
        console.error('[PROFILE] Database update error:', error);
        console.error('[PROFILE] Error details:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        
        let errorMessage = "Erro ao atualizar perfil";
        
        // Tratamento específico de erros
        if (error.code === '23505') {
          errorMessage = "Email já está em uso por outro usuário";
        } else if (error.code === '23514') {
          errorMessage = "Dados fornecidos não atendem aos critérios de segurança";
        } else if (error.code === '42501') {
          errorMessage = "Erro de permissão. Verifique se você está logado corretamente.";
        } else if (error.code === 'PGRST301') {
          errorMessage = "Erro de permissão no banco de dados";
        }
        
        toast({
          title: "Erro",
          description: errorMessage,
          variant: "destructive",
        });
        return { success: false, error: error.message };
      }

      if (!data) {
        console.error('[PROFILE] No data returned from update');
        toast({
          title: "Erro",
          description: "Nenhum dado retornado após atualização",
          variant: "destructive",
        });
        return { success: false, error: 'Nenhum dado retornado' };
      }

      // Atualizar o estado local com os dados retornados do banco
      setProfile(data);
      console.log('[PROFILE] Profile updated successfully in database:', data);
      
      toast({
        title: "Sucesso",
        description: "Perfil atualizado com sucesso",
      });
      
      return { success: true, data };
      
    } catch (error) {
      console.error('[PROFILE] Unexpected error during profile update:', error);
      toast({
        title: "Erro",
        description: "Erro inesperado ao atualizar perfil",
        variant: "destructive",
      });
      return { success: false, error: 'Erro inesperado' };
    }
  };

  // Função para deletar a conta com confirmação adicional
  const deleteAccount = async () => {
    if (!user) {
      console.error('[PROFILE] No user found for deletion');
      return { success: false, error: 'Usuário não autenticado' };
    }

    try {
      console.log('[PROFILE] Initiating account deletion for user:', user.id);
      
      // Verificar se há sessão ativa
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        return { success: false, error: 'Sessão expirada. Faça login novamente.' };
      }

      const { data, error } = await supabase.functions.invoke('delete-user-account', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        console.error('[PROFILE] Erro ao deletar conta:', error);
        return { success: false, error: error.message };
      }

      if (!data.success) {
        return { success: false, error: data.error || 'Erro ao deletar conta' };
      }

      console.log('[PROFILE] Account deletion successful');
      
      toast({
        title: "Conta deletada",
        description: "Sua conta foi deletada com sucesso",
      });

      // Fazer logout automático após deletar a conta
      await supabase.auth.signOut();
      
      return { success: true };
      
    } catch (error) {
      console.error('[PROFILE] Erro inesperado ao deletar conta:', error);
      toast({
        title: "Erro",
        description: "Erro inesperado ao deletar conta",
        variant: "destructive",
      });
      return { success: false, error: 'Erro inesperado ao deletar conta' };
    }
  };

  // Função para atualizar/refrescar o perfil
  const refreshProfile = async () => {
    console.log('[PROFILE] Refreshing profile...');
    await fetchProfile();
  };

  // Buscar perfil ao montar o componente ou quando o usuário mudar
  useEffect(() => {
    fetchProfile();
  }, [user]);

  return {
    profile,
    isLoading,
    updateProfile,
    deleteAccount,
    refreshProfile
  };
};
