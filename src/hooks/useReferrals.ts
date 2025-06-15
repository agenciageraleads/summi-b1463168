
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// Interface para dados de indicação
export interface ReferralData {
  referralCode: string;
  referralLink: string;
  referredByUserId: string | null;
  totalReferrals: number;
  referralsList: Array<{
    id: string;
    nome: string;
    email: string;
    created_at: string;
  }>;
}

export const useReferrals = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [referralData, setReferralData] = useState<ReferralData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Função para buscar dados de indicação do usuário
  const fetchReferralData = async () => {
    if (!user) {
      setReferralData(null);
      setIsLoading(false);
      return;
    }

    try {
      console.log('[REFERRALS] Buscando dados de indicação para:', user.id);
      
      // Buscar dados do perfil do usuário
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('referral_code, referred_by_user_id')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error('[REFERRALS] Erro ao buscar perfil:', profileError);
        throw profileError;
      }

      // Buscar usuários indicados por este usuário
      const { data: referrals, error: referralsError } = await supabase
        .from('profiles')
        .select('id, nome, email, created_at')
        .eq('referred_by_user_id', user.id)
        .order('created_at', { ascending: false });

      if (referralsError) {
        console.error('[REFERRALS] Erro ao buscar indicações:', referralsError);
        throw referralsError;
      }

      // Montar dados de resposta
      const referralLink = `${window.location.origin}/convite/${profile.referral_code}`;
      
      const data: ReferralData = {
        referralCode: profile.referral_code || '',
        referralLink,
        referredByUserId: profile.referred_by_user_id,
        totalReferrals: referrals?.length || 0,
        referralsList: referrals || []
      };

      setReferralData(data);
      console.log('[REFERRALS] Dados carregados:', data);
      
    } catch (error) {
      console.error('[REFERRALS] Erro ao carregar dados:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar dados de indicação",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Função para copiar link de indicação
  const copyReferralLink = async () => {
    if (!referralData?.referralLink) return;

    try {
      await navigator.clipboard.writeText(referralData.referralLink);
      toast({
        title: "Link copiado!",
        description: "Link de indicação copiado para a área de transferência",
      });
    } catch (error) {
      console.error('[REFERRALS] Erro ao copiar link:', error);
      toast({
        title: "Erro",
        description: "Erro ao copiar link",
        variant: "destructive",
      });
    }
  };

  // Carregar dados quando o usuário mudar
  useEffect(() => {
    fetchReferralData();
  }, [user]);

  return {
    referralData,
    isLoading,
    copyReferralLink,
    refreshReferralData: fetchReferralData
  };
};
