
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface Profile {
  id: string;
  nome: string;
  numero: string | null;
  instance_name: string | null;
  transcreve_audio_recebido: boolean;
  transcreve_audio_enviado: boolean;
  resume_audio: boolean;
  segundos_para_resumir: number;
  temas_urgentes: string;
  temas_importantes: string;
  created_at: string;
  updated_at: string;
}

const generateInstanceName = (nome: string, numero: string): string => {
  const cleanNome = nome.toLowerCase().replace(/[^a-z0-9]/g, '');
  const lastFourDigits = numero.slice(-4);
  return `${cleanNome}_${lastFourDigits}`;
};

export const useProfile = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfile = async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Erro ao buscar perfil:', error);
        toast({
          title: "Erro",
          description: "Não foi possível carregar as configurações do perfil",
          variant: "destructive",
        });
        return;
      }

      setProfile(data);
    } catch (error) {
      console.error('Erro inesperado:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user || !profile) return { error: 'Usuário não autenticado' };

    try {
      // Se nome ou número foram atualizados, gerar novo instance_name
      if (updates.nome || updates.numero) {
        const nome = updates.nome || profile.nome;
        const numero = updates.numero || profile.numero;
        
        if (nome && numero && numero.length >= 4) {
          updates.instance_name = generateInstanceName(nome, numero);
        }
      }

      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id);

      if (error) {
        toast({
          title: "Erro",
          description: "Não foi possível atualizar o perfil",
          variant: "destructive",
        });
        return { error: error.message };
      }

      // Update local state
      setProfile(prev => prev ? { ...prev, ...updates } : null);
      
      toast({
        title: "Sucesso!",
        description: "Configurações salvas com sucesso",
      });
      
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      return { error: message };
    }
  };

  // TAREFA 3: Nova função de exclusão usando a Edge Function robusta
  const deleteAccount = async (): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: 'Usuário não autenticado' };

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        return { success: false, error: 'Sessão não encontrada' };
      }

      // Chamar a Edge Function robusta para exclusão da conta
      const { data, error } = await supabase.functions.invoke('delete-user-account', {
        headers: {
          Authorization: `Bearer ${sessionData.session.access_token}`,
        },
      });

      if (error) {
        console.error('Erro na Edge Function de exclusão:', error);
        return { success: false, error: error.message };
      }

      if (!data?.success) {
        return { success: false, error: data?.error || 'Erro na exclusão da conta' };
      }

      toast({
        title: "Conta deletada",
        description: "Sua conta foi deletada com sucesso",
      });

      return { success: true };
    } catch (error) {
      console.error('Erro ao deletar conta:', error);
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      return { success: false, error: message };
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
    refetch: fetchProfile,
  };
};
