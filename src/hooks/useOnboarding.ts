
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
}

// Passos do onboarding
const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'welcome',
    title: 'Bem-vindo ao Summi! 🎉',
    description: 'Vamos te ajudar a configurar sua conta e conectar seu WhatsApp em alguns passos simples.',
    icon: '👋'
  },
  {
    id: 'profile',
    title: 'Configure seu Perfil',
    description: 'Primeiro, vamos configurar seu número de telefone nas configurações para conectar o WhatsApp.',
    target: 'settings-button',
    icon: '📱'
  },
  {
    id: 'whatsapp',
    title: 'Conecte seu WhatsApp',
    description: 'Após configurar seu telefone, você poderá conectar sua conta do WhatsApp usando o QR Code.',
    target: 'whatsapp-section',
    icon: '💬'
  },
  {
    id: 'messages',
    title: 'Monitore suas Conversas',
    description: 'Aqui você verá todas as suas conversas e poderá analisar as mensagens recebidas.',
    target: 'chats-section',
    icon: '📊'
  },
  {
    id: 'subscription',
    title: 'Gerencie sua Assinatura',
    description: 'Acompanhe seu plano e aproveite todas as funcionalidades da plataforma.',
    target: 'subscription-section',
    icon: '⭐'
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
