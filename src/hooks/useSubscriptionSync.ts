
import { useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

/**
 * Hook para sincronizar automaticamente dados de assinatura entre Stripe e banco local
 * Monitora mudanças na tabela subscribers e atualiza o estado da aplicação
 */
export const useSubscriptionSync = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  // Função para sincronizar dados de assinatura do Stripe com o banco local
  const syncSubscriptionData = useCallback(async () => {
    if (!user) return;

    try {
      console.log('[SYNC] Iniciando sincronização de dados de assinatura...');
      
      // Chama a função check-subscription para atualizar os dados no banco
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) return;

      const { data, error } = await supabase.functions.invoke('check-subscription', {
        headers: {
          Authorization: `Bearer ${sessionData.session.access_token}`,
        },
      });

      if (error) {
        console.error('[SYNC] Erro ao sincronizar assinatura:', error);
        return;
      }

      console.log('[SYNC] Dados de assinatura sincronizados:', data);
      
      // Busca os dados atualizados no banco local
      const { data: localData, error: localError } = await supabase
        .from('subscribers')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (localError && localError.code !== 'PGRST116') {
        console.error('[SYNC] Erro ao buscar dados locais:', localError);
        return;
      }

      console.log('[SYNC] Dados locais atualizados:', localData);
      
    } catch (error) {
      console.error('[SYNC] Erro na sincronização:', error);
    }
  }, [user]);

  // Configura listener para mudanças em tempo real na tabela subscribers
  useEffect(() => {
    if (!user) return;

    console.log('[SYNC] Configurando listener de tempo real para assinatura...');
    
    // Canal para escutar mudanças na tabela subscribers
    const channel = supabase
      .channel('subscription-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Escuta INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'subscribers',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('[SYNC] Mudança detectada na assinatura:', payload);
          
          // Mostra notificação quando há mudanças
          if (payload.eventType === 'UPDATE') {
            const newData = payload.new as any;
            if (newData.subscription_status === 'active') {
              toast({
                title: 'Assinatura Ativada!',
                description: 'Sua assinatura foi ativada com sucesso.',
                variant: 'default'
              });
            } else if (newData.subscription_status === 'inactive') {
              toast({
                title: 'Assinatura Cancelada',
                description: 'Sua assinatura foi cancelada.',
                variant: 'destructive'
              });
            }
          }
        }
      )
      .subscribe((status) => {
        console.log('[SYNC] Status do canal de tempo real:', status);
      });

    // Limpa o canal quando o componente é desmontado
    return () => {
      console.log('[SYNC] Removendo listener de tempo real...');
      supabase.removeChannel(channel);
    };
  }, [user, toast]);

  // Sincronização inicial quando o usuário faz login
  useEffect(() => {
    if (user) {
      console.log('[SYNC] Usuário logado, iniciando sincronização inicial...');
      syncSubscriptionData();
    }
  }, [user, syncSubscriptionData]);

  return {
    syncSubscriptionData
  };
};
