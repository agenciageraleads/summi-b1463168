import { useEffect, useMemo } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { DriverJsOnboarding, type DriverJsStep } from '@/components/Onboarding/DriverJsOnboarding';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

type OnboardingStage = 'welcome' | 'whatsapp' | 'dashboard';

const ONBOARDING_PARAM = 'onboarding';

const isOnboardingStage = (value: string | null): value is OnboardingStage =>
  value === 'welcome' || value === 'whatsapp' || value === 'dashboard';

export const OnboardingFlow = () => {
  const { user } = useAuth();
  const { profile, isLoading, refreshProfile } = useProfile();
  const { toast } = useToast();

  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const stageParam = searchParams.get(ONBOARDING_PARAM);
  const stage = isOnboardingStage(stageParam) ? stageParam : null;

  const shouldRun = Boolean(user && !isLoading && profile && !profile.onboarding_completed);

  // Limpar param inválido (se alguém mexer manualmente na URL)
  useEffect(() => {
    if (!shouldRun) return;
    if (!stageParam) return;
    if (isOnboardingStage(stageParam)) return;

    const next = new URLSearchParams(searchParams);
    next.delete(ONBOARDING_PARAM);
    setSearchParams(next, { replace: true });
  }, [shouldRun, stageParam, searchParams, setSearchParams]);

  // Auto-iniciar onboarding quando o usuário cair em /settings pela 1ª vez
  useEffect(() => {
    if (!shouldRun) return;
    if (stage) return;
    if (location.pathname !== '/settings') return;

    const next = new URLSearchParams(searchParams);
    if (!next.get('tab')) next.set('tab', 'connection');
    next.set(ONBOARDING_PARAM, 'welcome');
    setSearchParams(next, { replace: true });
  }, [shouldRun, stage, location.pathname, searchParams, setSearchParams]);

  // Garantir que cada etapa esteja na rota correta
  useEffect(() => {
    if (!shouldRun || !stage) return;

    if (stage === 'welcome' && location.pathname !== '/settings') {
      navigate('/settings?tab=connection&onboarding=welcome', { replace: true });
      return;
    }

    if (stage === 'whatsapp') {
      const tab = searchParams.get('tab');
      if (location.pathname !== '/settings' || tab !== 'connection') {
        navigate('/settings?tab=connection&onboarding=whatsapp', { replace: true });
      }
      return;
    }

    if (stage === 'dashboard' && location.pathname !== '/dashboard') {
      navigate('/dashboard?onboarding=dashboard', { replace: true });
    }
  }, [shouldRun, stage, location.pathname, navigate, searchParams]);

  const isReady =
    shouldRun &&
    stage !== null &&
    ((stage === 'welcome' && location.pathname === '/settings') ||
      (stage === 'whatsapp' && location.pathname === '/settings' && searchParams.get('tab') === 'connection') ||
      (stage === 'dashboard' && location.pathname === '/dashboard'));

  const steps = useMemo<DriverJsStep[]>(() => {
    if (!stage) return [];

    if (stage === 'welcome') {
      return [
        {
          element: 'body',
          popover: {
            title: 'Bem-vindo! (1/3)',
            description:
              'A Summi analisa suas conversas e destaca o que é importante/urgente. Em 2 passos você conecta o WhatsApp e entende onde ver os resultados.',
            side: 'over',
            align: 'center',
          },
        },
      ];
    }

    if (stage === 'whatsapp') {
      return [
        {
          element: '#onboarding-settings-whatsapp',
          popover: {
            title: 'Conecte seu WhatsApp (2/3)',
            description: 'Use esta seção para conectar seu WhatsApp e começar a receber resumos e transcrições.',
            side: 'bottom',
            align: 'center',
          },
        },
      ];
    }

    return [
      {
        element: '#onboarding-dashboard-results',
        popover: {
          title: 'Pronto! (3/3)',
          description: 'Aqui você vê suas conversas priorizadas e os resultados da análise.',
          side: 'bottom',
          align: 'center',
        },
      },
    ];
  }, [stage]);

  const options = useMemo(() => {
    if (!stage) return undefined;

    if (stage === 'dashboard') return { doneBtnText: 'Concluir', overlayOpacity: 0.35 };
    return { doneBtnText: 'Próximo', overlayOpacity: 0.35 };
  }, [stage]);

  const markCompleted = async () => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ onboarding_completed: true })
        .eq('id', user.id);

      if (error) {
        console.error('[ONBOARDING] Erro ao marcar onboarding como completo:', error);
        return;
      }

      await refreshProfile();
    } catch (error) {
      console.error('[ONBOARDING] Erro inesperado ao marcar onboarding como completo:', error);
    }
  };

  const clearOnboardingParam = () => {
    const next = new URLSearchParams(searchParams);
    next.delete(ONBOARDING_PARAM);
    setSearchParams(next, { replace: true });
  };

  const handleComplete = async () => {
    if (!stage) return;

    if (stage === 'welcome') {
      navigate('/settings?tab=connection&onboarding=whatsapp', { replace: true });
      return;
    }

    if (stage === 'whatsapp') {
      navigate('/dashboard?onboarding=dashboard', { replace: true });
      return;
    }

    await markCompleted();
    clearOnboardingParam();
    toast({
      title: 'Tutorial concluído! 🎉',
      description: 'Tudo pronto — conecte seu WhatsApp e acompanhe os resultados no dashboard.',
    });
  };

  const handleExit = async () => {
    await markCompleted();
    clearOnboardingParam();
    toast({
      title: 'Tutorial encerrado',
      description: 'Você pode conectar o WhatsApp a qualquer momento em Configurações → Conexão.',
    });
  };

  return (
    <DriverJsOnboarding
      enabled={isReady}
      steps={steps}
      options={options}
      onComplete={handleComplete}
      onExit={handleExit}
    />
  );
};
