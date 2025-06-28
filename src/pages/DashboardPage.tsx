
import { DashboardLayout } from '@/components/Layout/DashboardLayout';
import { WhatsAppSection } from '@/components/Dashboard/WhatsAppSection';
import { ChatsList } from '@/components/Dashboard/ChatsList';
import { OnboardingTour } from '@/components/Onboarding/OnboardingTour';
import { OnboardingHighlight } from '@/components/Onboarding/OnboardingHighlight';

const DashboardPage = () => {
  return (
    <DashboardLayout>
      {/* Tour de Onboarding */}
      <OnboardingTour />
      
      <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">
        
        {/* Header do Dashboard */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Dashboard 📊
          </h1>
          <p className="text-muted-foreground">
            Gerencie suas conexões e monitore suas mensagens
          </p>
        </div>

        {/* Grid Principal Reorganizada */}
        <div className="space-y-6">
          {/* Lista de Chats em destaque - com highlight para onboarding */}
          <OnboardingHighlight targetId="chats-section">
            <ChatsList />
          </OnboardingHighlight>

          {/* Seção do WhatsApp integrada - com highlight para onboarding */}
          <OnboardingHighlight targetId="whatsapp-section">
            <WhatsAppSection />
          </OnboardingHighlight>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default DashboardPage;
