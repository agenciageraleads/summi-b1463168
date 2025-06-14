
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

  // Verificar status de conexão real via Evolution API
  const checkRealConnectionStatus = async (instanceName: string): Promise<'connected' | 'disconnected'> => {
    try {
      console.log(`[Admin] Verificando status real da instância: ${instanceName}`);
      
      const { data, error } = await supabase.functions.invoke('evolution-api-handler', {
        body: { 
          action: 'get-status'
        },
        headers: {
          'instance-name': instanceName,
        },
      });

      if (error) {
        console.error(`[Admin] Erro ao verificar status de ${instanceName}:`, error);
        return 'disconnected';
      }

      // Verificar se o status é "OPEN" (conectado)
      const isConnected = data?.status === 'OPEN';
      console.log(`[Admin] Status de ${instanceName}: ${data?.status} - ${isConnected ? 'conectado' : 'desconectado'}`);
      
      return isConnected ? 'connected' : 'disconnected';
    } catch (error) {
      console.error(`[Admin] Erro ao verificar conexão de ${instanceName}:`, error);
      return 'disconnected';
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

      // Buscar usuários com instance_name (potencialmente conectados)
      const { data: usersWithInstances } = await supabase
        .from('profiles')
        .select('instance_name')
        .not('instance_name', 'is', null);

      // Verificar status real de conexão
      let connectedCount = 0;
      if (usersWithInstances) {
        const connectionChecks = usersWithInstances.map(async (user) => {
          if (user.instance_name) {
            const status = await checkRealConnectionStatus(user.instance_name);
            return status === 'connected';
          }
          return false;
        });
        
        const results = await Promise.all(connectionChecks);
        connectedCount = results.filter(Boolean).length;
      }

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
        connectedUsers: connectedCount,
        disconnectedUsers: (totalUsers || 0) - connectedCount,
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
      console.log('[Admin] Buscando usuários...');
      
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

      // Verificar status real de conexão para cada usuário com instance_name
      const usersWithRealStatus = await Promise.all(
        (profilesData || []).map(async (profile) => {
          const subscription = subscribersData?.find(sub => sub.user_id === profile.id);
          
          let connectionStatus: 'connected' | 'disconnected' | 'unknown' = 'unknown';
          
          if (profile.instance_name) {
            console.log(`[Admin] Verificando conexão para ${profile.nome} (${profile.instance_name})`);
            connectionStatus = await checkRealConnectionStatus(profile.instance_name);
          } else {
            connectionStatus = 'disconnected';
          }

          return {
            ...profile,
            subscription_status: subscription?.subscription_status || 'inactive',
            connectionStatus,
          };
        })
      );

      console.log('[Admin] Usuários carregados com status real:', usersWithRealStatus.length);
      setUsers(usersWithRealStatus);
    } catch (error) {
      console.error('Erro ao buscar usuários:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar lista de usuários",
        variant: "destructive",
      });
    }
  };

  // Reiniciar instância de usuário
  const restartUserInstance = async (userId: string, instanceName: string) => {
    if (!isAdmin) {
      toast({
        title: "Erro",
        description: "Acesso negado",
        variant: "destructive",
      });
      return false;
    }

    try {
      console.log(`[Admin] Reiniciando instância ${instanceName} do usuário ${userId}`);
      
      const { data, error } = await supabase.functions.invoke('evolution-api-handler', {
        body: { 
          action: 'restart',
          instanceName 
        },
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "Sucesso",
          description: "Instância reiniciada com sucesso",
        });
        await fetchUsers(); // Recarregar lista
        return true;
      } else {
        throw new Error(data.error || 'Erro ao reiniciar instância');
      }
    } catch (error) {
      console.error('Erro ao reiniciar instância:', error);
      toast({
        title: "Erro",
        description: "Erro ao reiniciar instância",
        variant: "destructive",
      });
      return false;
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
    restartUserInstance, // Nova função para reiniciar instância
  };
};
