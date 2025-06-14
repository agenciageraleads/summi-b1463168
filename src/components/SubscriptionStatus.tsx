import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Crown, Calendar, RefreshCw, Clock } from 'lucide-react';
import { useSubscriptionSync } from '@/hooks/useSubscriptionSync';
import { useNavigate } from 'react-router-dom';

interface SubscriptionData {
  isSubscribed: boolean;
  status: string; // 'trialing', 'active', 'inactive', etc.
  stripe_price_id: string | null;
  subscription_end: string | null;
  plan_type: string | null;
}

/**
 * Componente para exibir status atual da assinatura baseado nos dados do banco local
 */
export const SubscriptionStatus = () => {
  const { user } = useAuth();
  const { syncSubscriptionData } = useSubscriptionSync();
  const [subscriptionData, setSubscriptionData] = useState<SubscriptionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const navigate = useNavigate();

  // Carrega dados de assinatura do banco local
  const loadSubscriptionData = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('subscribers')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Erro ao carregar dados de assinatura:', error);
        return;
      }

      if (data) {
        // Determina o tipo de plano baseado no stripe_price_id
        let planType = null;
        if (data.stripe_price_id === 'price_1RZ8j9KyDqE0F1PtNvJzdK0F') {
          planType = 'monthly';
        } else if (data.stripe_price_id === 'price_1RZ8j9KyDqE0F1PtIlw9cx2C') {
          planType = 'annual';
        }

        setSubscriptionData({
          isSubscribed: data.subscription_status === 'active' || data.subscription_status === 'trialing',
          status: data.subscription_status || 'inactive',
          stripe_price_id: data.stripe_price_id,
          subscription_end: data.subscription_end,
          plan_type: planType
        });
      } else {
        setSubscriptionData({
          isSubscribed: false,
          status: 'inactive',
          stripe_price_id: null,
          subscription_end: null,
          plan_type: null
        });
      }
    } catch (error) {
      console.error('Erro ao carregar dados de assinatura:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Função para forçar atualização dos dados
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await syncSubscriptionData();
      await loadSubscriptionData();
    } finally {
      setIsRefreshing(false);
    }
  }, [syncSubscriptionData, loadSubscriptionData]);

  // Carrega e sincroniza dados iniciais para evitar a condição de corrida
  useEffect(() => {
    const initialSyncAndLoad = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      try {
        // Primeiro, sincroniza os dados do Stripe com o Supabase para garantir que estão atualizados.
        await syncSubscriptionData();
        // Depois, carrega os dados já atualizados do banco local para exibir.
        await loadSubscriptionData();
      } catch (error) {
        console.error("Erro na sincronização e carregamento inicial:", error);
        setIsLoading(false); // Garante que o loading para em caso de erro.
      }
    };

    initialSyncAndLoad();
  }, [user, syncSubscriptionData, loadSubscriptionData]);

  // Configura listener para mudanças em tempo real
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('subscription-status-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'subscribers',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          loadSubscriptionData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, loadSubscriptionData]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-summi-green"></div>
            <span className="ml-2 text-summi-gray-600">Carregando status da assinatura...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!subscriptionData) {
    return (
      <Card className="border-summi-gray-200">
        <CardContent className="p-6">
          <div className="text-center">
            <p className="text-summi-gray-600">Nenhuma assinatura encontrada</p>
            <Button 
              onClick={handleRefresh}
              variant="outline"
              size="sm"
              className="mt-2"
              disabled={isRefreshing}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              Verificar Novamente
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'trialing': return 'Em teste';
      case 'active': return 'Ativo';
      default: return 'Inativo';
    }
  };

  return (
    <Card className={`${subscriptionData.isSubscribed ? 'border-summi-green bg-summi-green/5' : 'border-summi-gray-200'}`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Crown className={`w-5 h-5 ${subscriptionData.isSubscribed ? 'text-summi-green' : 'text-summi-gray-400'}`} />
            <span className={subscriptionData.isSubscribed ? 'text-summi-green' : 'text-summi-gray-600'}>
              Status da Assinatura
            </span>
          </div>
          <Button 
            onClick={handleRefresh}
            variant="ghost"
            size="sm"
            disabled={isRefreshing}
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-summi-gray-600">Status:</span>
            <Badge 
              className={subscriptionData.isSubscribed 
                ? 'bg-summi-green text-white' 
                : 'bg-summi-gray-100 text-summi-gray-600'
              }
            >
              {getStatusText(subscriptionData.status)}
            </Badge>
          </div>

          {subscriptionData.plan_type && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-summi-gray-600">Plano:</span>
              <span className="text-sm font-medium text-summi-gray-900">
                {subscriptionData.plan_type === 'monthly' ? 'Mensal' : 'Anual'}
              </span>
            </div>
          )}

          {subscriptionData.status === 'trialing' && subscriptionData.subscription_end && (
             <div className="flex items-center justify-between p-2 bg-blue-50 border border-blue-200 rounded-md">
                <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-blue-600" />
                  <span className="text-sm text-blue-700">Seu teste termina em:</span>
                </div>
                <span className="text-sm font-medium text-blue-800">
                  {new Date(subscriptionData.subscription_end).toLocaleDateString('pt-BR')}
                </span>
            </div>
          )}

          {subscriptionData.status === 'active' && subscriptionData.subscription_end && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-summi-gray-600">Próxima cobrança:</span>
              <div className="flex items-center space-x-1">
                <Calendar className="w-4 h-4 text-summi-gray-400" />
                <span className="text-sm text-summi-gray-900">
                  {new Date(subscriptionData.subscription_end).toLocaleDateString('pt-BR')}
                </span>
              </div>
            </div>
          )}

          {subscriptionData.stripe_price_id && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-summi-gray-600">Price ID:</span>
              <span className="text-xs font-mono text-summi-gray-500">
                {subscriptionData.stripe_price_id}
              </span>
            </div>
          )}
        </div>

        {/* CTA para usuários inativos */}
        {subscriptionData.status === 'inactive' && (
          <div className="mt-4 pt-4 border-t border-summi-gray-200 text-center">
            <h4 className="font-semibold text-summi-gray-800">Ative sua conta para continuar</h4>
            <p className="text-sm text-summi-gray-600 mt-2">
              Para utilizar todas as funcionalidades da Summi, é necessário ter uma assinatura ativa. Inicie agora e aproveite um <strong>período de teste gratuito</strong>.
            </p>
            <Button
              onClick={() => navigate('/subscription')}
              className="mt-4 w-full bg-summi-gradient text-white hover:opacity-90"
            >
              Ver Planos e Iniciar Teste
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
