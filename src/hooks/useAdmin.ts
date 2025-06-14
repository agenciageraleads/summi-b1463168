
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// Interface para dados administrativos
export interface AdminStats {
  totalUsers: number;
  totalSubscribers: number;
  trialUsers: number;
  connectedUsers: number;
  disconnectedUsers: number;
  totalChats: number;
  totalFeedback: number;
}

// Interface para gestão de usuários
export interface AdminUser {
  id: string;
  nome: string;
  numero?: string;
  instance_name?: string;
  role: string;
  created_at: string;
  email?: string;
  subscription_status?: string;
  connectionStatus?: 'connected' | 'disconnected' | 'unknown';
}

export const useAdmin = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);

  // Verificar se o usuário é admin
  const checkAdminStatus = async () => {
    if (!user) {
      setIsAdmin(false);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.rpc('is_admin', { user_id: user.id });
      
      if (error) {
        console.error('Erro ao verificar status de admin:', error);
        setIsAdmin(false);
      } else {
        setIsAdmin(data || false);
      }
    } catch (error) {
      console.error('Erro inesperado ao verificar admin:', error);
      setIsAdmin(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Buscar estatísticas administrativas
  const fetchStats = async () => {
    if (!isAdmin) return;

    try {
      // Buscar total de usuários
      const { count: totalUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Buscar assinantes ativos
      const { count: totalSubscribers } = await supabase
        .from('subscribers')
        .select('*', { count: 'exact', head: true })
        .eq('subscription_status', 'active');

      // Buscar usuários em trial
      const { count: trialUsers } = await supabase
        .from('subscribers')
        .select('*', { count: 'exact', head: true })
        .eq('subscription_status', 'trialing');

      // Buscar usuários conectados (com instance_name)
      const { count: connectedUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .not('instance_name', 'is', null);

      // Buscar total de chats
      const { count: totalChats } = await supabase
        .from('chats')
        .select('*', { count: 'exact', head: true });

      // Buscar total de feedback
      const { count: totalFeedback } = await supabase
        .from('feedback')
        .select('*', { count: 'exact', head: true });

      const statsData: AdminStats = {
        totalUsers: totalUsers || 0,
        totalSubscribers: totalSubscribers || 0,
        trialUsers: trialUsers || 0,
        connectedUsers: connectedUsers || 0,
        disconnectedUsers: (totalUsers || 0) - (connectedUsers || 0),
        totalChats: totalChats || 0,
        totalFeedback: totalFeedback || 0,
      };

      setStats(statsData);
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar estatísticas administrativas",
        variant: "destructive",
      });
    }
  };

  // Buscar todos os usuários para gestão
  const fetchUsers = async () => {
    if (!isAdmin) return;

    try {
      // Buscar perfis com informações de assinatura
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select(`
          id,
          nome,
          numero,
          instance_name,
          role,
          created_at
        `);

      if (profilesError) throw profilesError;

      // Buscar dados de assinatura
      const { data: subscribersData, error: subscribersError } = await supabase
        .from('subscribers')
        .select('user_id, subscription_status');

      if (subscribersError) throw subscribersError;

      // Combinar dados
      const usersWithSubscription = profilesData?.map(profile => {
        const subscription = subscribersData?.find(sub => sub.user_id === profile.id);
        return {
          ...profile,
          subscription_status: subscription?.subscription_status || 'inactive',
          connectionStatus: profile.instance_name ? 'connected' : 'disconnected' as 'connected' | 'disconnected',
        };
      }) || [];

      setUsers(usersWithSubscription);
    } catch (error) {
      console.error('Erro ao buscar usuários:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar lista de usuários",
        variant: "destructive",
      });
    }
  };

  // Deletar conta de usuário
  const deleteUserAccount = async (userId: string) => {
    if (!isAdmin) {
      toast({
        title: "Erro",
        description: "Acesso negado",
        variant: "destructive",
      });
      return false;
    }

    try {
      const { data, error } = await supabase.functions.invoke('delete-user-account', {
        body: { target_user_id: userId },
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "Sucesso",
          description: "Conta do usuário deletada com sucesso",
        });
        await fetchUsers(); // Recarregar lista
        return true;
      } else {
        throw new Error(data.error || 'Erro ao deletar conta');
      }
    } catch (error) {
      console.error('Erro ao deletar conta:', error);
      toast({
        title: "Erro",
        description: "Erro ao deletar conta do usuário",
        variant: "destructive",
      });
      return false;
    }
  };

  // Desconectar usuário (limpar instance_name)
  const disconnectUser = async (userId: string) => {
    if (!isAdmin) {
      toast({
        title: "Erro",
        description: "Acesso negado",
        variant: "destructive",
      });
      return false;
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ instance_name: null })
        .eq('id', userId);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Usuário desconectado com sucesso",
      });
      await fetchUsers(); // Recarregar lista
      return true;
    } catch (error) {
      console.error('Erro ao desconectar usuário:', error);
      toast({
        title: "Erro",
        description: "Erro ao desconectar usuário",
        variant: "destructive",
      });
      return false;
    }
  };

  useEffect(() => {
    checkAdminStatus();
  }, [user]);

  useEffect(() => {
    if (isAdmin) {
      fetchStats();
      fetchUsers();
    }
  }, [isAdmin]);

  return {
    isAdmin,
    isLoading,
    stats,
    users,
    fetchStats,
    fetchUsers,
    deleteUserAccount,
    disconnectUser,
  };
};
