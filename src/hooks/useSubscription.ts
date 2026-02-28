// ABOUTME: Hook para gerenciar assinatura e checkout do Stripe.
// ABOUTME: createCheckout funciona SEM autenticação (Stripe-First). checkSubscription e manageSubscription exigem login.

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { normalizePlanType, type PlanType } from '@/lib/subscriptionPlans';

export interface Subscription {
  subscribed: boolean;
  plan_type: PlanType | null;
  stripe_price_id: string | null;
  subscription_end: string | null;
  cancel_at_period_end: boolean;
}

export const createCheckoutSession = async (planType: 'monthly' | 'annual', referralCode?: string) => {
  const { data: sessionData } = await supabase.auth.getSession();
  const headers: Record<string, string> = {};

  if (sessionData.session?.access_token) {
    headers.Authorization = `Bearer ${sessionData.session.access_token}`;
  }

  const { data, error } = await supabase.functions.invoke('create-checkout', {
    headers,
    body: { planType, ...(referralCode ? { referralCode } : {}) },
  });

  if (error) throw error;

  if (data?.url) {
    window.location.href = data.url;
  }

  return data;
};

export const useSubscription = () => {
  const [subscription, setSubscription] = useState<Subscription>({
    subscribed: false,
    plan_type: null,
    stripe_price_id: null,
    subscription_end: null,
    cancel_at_period_end: false
  });
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  // Verificar assinatura no Stripe (requer login)
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

      const planType = normalizePlanType(data.plan_type, data.stripe_price_id);
      setSubscription({
        subscribed: data.subscribed || false,
        plan_type: planType,
        stripe_price_id: data.stripe_price_id || null,
        subscription_end: data.subscription_end || null,
        cancel_at_period_end: data.cancel_at_period_end || false
      });
    } catch (error) {
      console.error('Erro ao verificar assinatura:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Criar checkout do Stripe — funciona SEM login (Stripe-First)
  const createCheckout = async (planType: 'monthly' | 'annual', referralCode?: string) => {
    try {
      await createCheckoutSession(planType, referralCode);
    } catch (error) {
      console.error('Erro ao criar checkout:', error);
      throw error;
    }
  };

  // Gerenciar assinatura via portal do cliente (requer login)
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

      window.open(data.url, '_blank');
    } catch (error) {
      console.error('Erro ao abrir portal do cliente:', error);
      throw error;
    }
  };

  useEffect(() => {
    if (user) {
      checkSubscription();
    } else {
      setIsLoading(false);
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
