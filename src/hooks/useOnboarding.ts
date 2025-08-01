
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  target?: string;
  icon?: string;
  actionText?: string;
  actionPath?: string;
}

// Passos do onboarding
const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'welcome',
    title: 'Bem-vindo ao ConectaMentor IA! 🎉',
    description: 'Vamos configurar sua conta em 3 passos simples para começar a monitorar mensagens importantes do WhatsApp.',
    icon: '👋'
  },
  {
    id: 'profile',
    title: 'Passo 1: Configure seu Perfil',
    description: 'Clique no botão "Ir para Configurações" abaixo para adicionar seu nome e número de telefone.',
    target: 'profile-section',
    icon: '👤',
    actionText: 'Ir para Configurações',
    actionPath: '/settings'
  },
  {
    id: 'whatsapp',
    title: 'Passo 2: Conecte o WhatsApp',
    description: 'Após configurar seu perfil, clique em "Conectar WhatsApp" no menu lateral para vincular sua conta.',
    target: 'whatsapp-connection',
    icon: '💬',
    actionText: 'Conectar WhatsApp',
    actionPath: '/whatsapp-connection'
  },
  {
    id: 'dashboard',
    title: 'Passo 3: Monitore suas Conversas',
    description: 'Com tudo conectado, acesse o Dashboard para ver suas conversas sendo analisadas automaticamente.',
    target: 'dashboard-link',
    icon: '📊',
    actionText: 'Ir para Dashboard',
    actionPath: '/dashboard'
  },
  {
    id: 'complete',
    title: 'Tudo Pronto! ✨',
    description: 'Parabéns! Sua conta está configurada. O ConectaMentor IA já está monitorando suas conversas e identificando mensagens importantes.',
    icon: '🎊'
  }
];

export const useOnboarding = () => {
  const [isOnboardingActive, setIsOnboardingActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  // Verificar se o usuário já fez o onboarding
  useEffect(() => {
    if (user) {
      checkOnboardingStatus();
    }
  }, [user]);

  const checkOnboardingStatus = async () => {
    try {
      setIsLoading(true);
      
      // Verificar se o usuário já completou o onboarding
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('onboarding_completed')
        .eq('id', user?.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Erro ao verificar status do onboarding:', error);
        return;
      }

      // Se não existe o campo ou é false, mostrar onboarding
      const shouldShowOnboarding = !profile?.onboarding_completed;
      setIsOnboardingActive(shouldShowOnboarding);
      
    } catch (error) {
      console.error('Erro inesperado no onboarding:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const nextStep = () => {
    if (currentStep < ONBOARDING_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      completeOnboarding();
    }
  };

  const previousStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const skipOnboarding = () => {
    completeOnboarding();
  };

  const completeOnboarding = async () => {
    try {
      // Marcar onboarding como completo no banco
      const { error } = await supabase
        .from('profiles')
        .update({ onboarding_completed: true })
        .eq('id', user?.id);

      if (error) {
        console.error('Erro ao completar onboarding:', error);
        toast({
          title: "Aviso",
          description: "Não foi possível salvar o progresso do tutorial.",
          variant: "destructive",
        });
      }

      setIsOnboardingActive(false);
      setCurrentStep(0);
      
      toast({
        title: "Tutorial Concluído! 🎉",
        description: "Agora você está pronto para usar todas as funcionalidades da plataforma.",
      });
    } catch (error) {
      console.error('Erro ao completar onboarding:', error);
    }
  };

  const restartOnboarding = () => {
    setCurrentStep(0);
    setIsOnboardingActive(true);
  };

  return {
    isOnboardingActive,
    currentStep,
    isLoading,
    steps: ONBOARDING_STEPS,
    nextStep,
    previousStep,
    skipOnboarding,
    completeOnboarding,
    restartOnboarding,
    totalSteps: ONBOARDING_STEPS.length
  };
};
