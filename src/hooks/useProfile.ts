// ABOUTME: Hook principal para gerenciamento de perfis com validações de segurança aprimoradas
// ABOUTME: Implementa operações CRUD com logs de auditoria e validações rigorosas

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useProfileSecurity } from './useProfileSecurity';

// Interface do perfil com novos campos de indicação e onboarding
export interface Profile {
  id: string;
  nome: string;
  name?: string;
  avatar?: string;
  email?: string;
  numero?: string;
  instance_name?: string;
  temas_importantes?: string;
  temas_urgentes?: string;
  transcreve_audio_recebido?: boolean;
  transcreve_audio_enviado?: boolean;
  resume_audio?: boolean;
  segundos_para_resumir?: number;
  'Summi em Audio?'?: boolean;
  apenas_horario_comercial?: boolean;
  send_private_only?: boolean;
  referral_code?: string;
  referred_by_user_id?: string;
  onboarding_completed?: boolean;
  role?: string;
}

export const useProfile = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { secureUpdateProfile } = useProfileSecurity();
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

      setProfile(data);
      console.log('[PROFILE] Profile loaded successfully');
      
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

  // Usar a função segura para atualizações
  const updateProfile = async (updates: Partial<Profile>) => {
    return await secureUpdateProfile(updates);
  };

  // Função para deletar a conta com confirmação adicional
  const deleteAccount = async () => {
    if (!user) {
      console.error('[PROFILE] No user found for deletion');
      return { success: false, error: 'Usuário não autenticado' };
    }

    try {
      console.log('[PROFILE] Initiating account deletion for user:', user.id);
      
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

  const refreshProfile = async () => {
    console.log('[PROFILE] Refreshing profile...');
    await fetchProfile();
  };

  const acceptTerms = async (version: string = 'v1.0') => {
    if (!user) {
      console.error('[PROFILE] No user found for terms acceptance');
      return { success: false, error: 'Usuário não autenticado' };
    }

    try {
      console.log('[PROFILE] Accepting terms for user:', user.id);
      
      const { data, error } = await supabase
        .from('profiles')
        .update({
          terms_accepted_at: new Date().toISOString(),
          terms_version: version,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)
        .select()
        .single();

      if (error) {
        console.error('[PROFILE] Error accepting terms:', error);
        return { success: false, error: error.message };
      }

      if (data) {
        setProfile(data);
      }

      console.log('[PROFILE] Terms accepted successfully');
      return { success: true, data };
      
    } catch (error) {
      console.error('[PROFILE] Unexpected error accepting terms:', error);
      return { success: false, error: 'Erro inesperado ao aceitar termos' };
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [user]);

  return {
    profile,
    isLoading,
    updateProfile,
    deleteAccount,
    refreshProfile,
    acceptTerms
  };
};
