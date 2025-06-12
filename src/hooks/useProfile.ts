
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface Profile {
  id: string;
  nome: string;
  numero: string | null;
  transcreve_audio_recebido: boolean;
  transcreve_audio_enviado: boolean;
  resume_audio: boolean;
  segundos_para_resumir: number;
  temas_urgentes: string;
  temas_importantes: string;
  created_at: string;
  updated_at: string;
}

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

  useEffect(() => {
    fetchProfile();
  }, [user]);

  return {
    profile,
    isLoading,
    updateProfile,
    refetch: fetchProfile,
  };
};
