
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Profile {
  id: string;
  nome: string;
  numero?: string;
  instance_name?: string;
  temas_importantes?: string;
  temas_urgentes?: string;
  transcreve_audio_recebido?: boolean;
  transcreve_audio_enviado?: boolean;
  resume_audio?: boolean;
  segundos_para_resumir?: number;
}

export const useProfile = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Função para buscar o perfil
  const fetchProfile = async () => {
    if (!user) {
      setProfile(null);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Erro ao buscar perfil:', error);
        return;
      }

      setProfile(data);
    } catch (error) {
      console.error('Erro inesperado ao buscar perfil:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Função para atualizar o perfil
  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) return { success: false, error: 'Usuário não autenticado' };

    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({ 
          ...updates, 
          updated_at: new Date().toISOString() 
        })
        .eq('id', user.id)
        .select()
        .single();

      if (error) {
        console.error('Erro ao atualizar perfil:', error);
        toast({
          title: "Erro",
          description: "Erro ao atualizar perfil",
          variant: "destructive",
        });
        return { success: false, error: error.message };
      }

      setProfile(data);
      return { success: true, data };
    } catch (error) {
      console.error('Erro inesperado ao atualizar perfil:', error);
      toast({
        title: "Erro",
        description: "Erro inesperado ao atualizar perfil",
        variant: "destructive",
      });
      return { success: false, error: 'Erro inesperado' };
    }
  };

  // Função para atualizar/refrescar o perfil
  const refreshProfile = async () => {
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
    refreshProfile
  };
};
