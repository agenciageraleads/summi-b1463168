
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export const useTrialDays = () => {
  const { user } = useAuth();
  const [trialDaysLeft, setTrialDaysLeft] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const calculateTrialDays = () => {
    if (!user?.created_at) return null;
    
    // Assumindo que o trial dura 7 dias a partir da criação da conta
    const createdAt = new Date(user.created_at);
    const trialEndsAt = new Date(createdAt.getTime() + (7 * 24 * 60 * 60 * 1000)); // 7 dias
    const now = new Date();
    
    if (now > trialEndsAt) {
      return 0; // Trial expirado
    }
    
    const diffTime = trialEndsAt.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return Math.max(0, diffDays);
  };

  const checkSubscriptionStatus = async () => {
    if (!user) return;
    
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) return;

      const { data, error } = await supabase.functions.invoke('check-subscription', {
        headers: {
          Authorization: `Bearer ${sessionData.session.access_token}`,
        },
      });

      if (!error && data?.subscribed) {
        setTrialDaysLeft(null); // Usuário tem assinatura ativa
      } else {
        const daysLeft = calculateTrialDays();
        setTrialDaysLeft(daysLeft);
      }
    } catch (error) {
      console.error('Erro ao verificar assinatura:', error);
      const daysLeft = calculateTrialDays();
      setTrialDaysLeft(daysLeft);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      checkSubscriptionStatus();
    } else {
      setIsLoading(false);
    }
  }, [user]);

  return {
    trialDaysLeft,
    isLoading,
    hasTrialExpired: trialDaysLeft === 0,
    isInTrial: trialDaysLeft !== null && trialDaysLeft > 0,
    refreshTrialStatus: checkSubscriptionStatus
  };
};
