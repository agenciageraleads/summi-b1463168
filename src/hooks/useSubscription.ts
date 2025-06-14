
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface Subscription {
  subscribed: boolean;
  plan_type: string | null;
  stripe_price_id: string | null;
  subscription_end: string | null;
}

export const useSubscription = () => {
  const [subscription, setSubscription] = useState<Subscription>({
    subscribed: false,
    plan_type: null,
    stripe_price_id: null,
    subscription_end: null
  });
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  // Função para verificar assinatura no Stripe
  const checkSubscription = async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) return;

      const { data, error } = await supabase.functions.invoke('check-subscription', {
        headers: {
          Authorization: `Bearer ${sessionData.session.access_token}`,
        },
      });

      if (error) {
        console.error('Erro ao verificar assinatura:', error);
        return;
      }

      setSubscription({
        subscribed: data.subscribed || false,
        plan_type: data.plan_type || null,
        stripe_price_id: data.stripe_price_id || null,
        subscription_end: data.subscription_end || null
      });
    } catch (error) {
      console.error('Erro ao verificar assinatura:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Função para criar checkout do Stripe
  const createCheckout = async (planType: 'monthly' | 'annual') => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) throw new Error('Usuário não autenticado');

      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { planType },
        headers: {
          Authorization: `Bearer ${sessionData.session.access_token}`,
        },
      });

      if (error) throw error;
      
      // Abrir Stripe checkout em nova aba
      window.open(data.url, '_blank');
    } catch (error) {
      console.error('Erro ao criar checkout:', error);
      throw error;
    }
  };

  // Função para gerenciar assinatura via portal do cliente
  const manageSubscription = async () => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) throw new Error('Usuário não autenticado');

      const { data, error } = await supabase.functions.invoke('customer-portal', {
        headers: {
          Authorization: `Bearer ${sessionData.session.access_token}`,
        },
      });

      if (error) throw error;
      
      // Abrir portal do cliente em nova aba
      window.open(data.url, '_blank');
    } catch (error) {
      console.error('Erro ao abrir portal do cliente:', error);
      throw error;
    }
  };

  useEffect(() => {
    if (user) {
      checkSubscription();
    }
  }, [user]);

  return {
    subscription,
    isLoading,
    checkSubscription,
    createCheckout,
    manageSubscription
  };
};
