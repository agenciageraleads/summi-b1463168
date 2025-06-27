
import { DashboardLayout } from '@/components/Layout/DashboardLayout';
import { WhatsAppStatusCard } from '@/components/Dashboard/WhatsAppStatusCard';
import { ChatsList } from '@/components/Dashboard/ChatsList';
import { OnboardingTour } from '@/components/Onboarding/OnboardingTour';
import { OnboardingHighlight } from '@/components/Onboarding/OnboardingHighlight';

const DashboardPage = () => {
  return (
    <DashboardLayout>
      {/* Tour de Onboarding */}
      <OnboardingTour />
      
      <div className="max-w-7xl mx-auto space-y-8 animate-fade-in">
        
        {/* Header do Dashboard */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Dashboard 📊
          </h1>
          <p className="text-muted-foreground">
            Gerencie sua conexão e monitore suas mensagens
          </p>
        </div>

        {/* Status Card Principal - Estilo "ziptalk" */}
        <div className="flex justify-center">
          <OnboardingHighlight targetId="whatsapp-status">
            <WhatsAppStatusCard />
          </OnboardingHighlight>
        </div>

        {/* Lista de Chats */}
        <OnboardingHighlight targetId="chats-section">
          <ChatsList />
        </OnboardingHighlight>
      </div>
    </DashboardLayout>
  );
};

export default DashboardPage;
