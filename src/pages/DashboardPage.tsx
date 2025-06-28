
import { DashboardLayout } from '@/components/Layout/DashboardLayout';
import { WhatsAppSection } from '@/components/Dashboard/WhatsAppSection';
import { ChatsList } from '@/components/Dashboard/ChatsList';
import { WhatsAppStatusCard } from '@/components/Dashboard/WhatsAppStatusCard';
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

        {/* Novo Componente de Status da Conexão */}
        <WhatsAppStatusCard />

        {/* Grid Principal Reorganizada */}
        <div className="space-y-6">
          {/* Lista de Chats em destaque - com highlight para onboarding */}
          <OnboardingHighlight targetId="chats-section">
            <ChatsList />
          </OnboardingHighlight>

          {/* Grid para os outros widgets */}
          <div className="grid gap-6 md:grid-cols-1">
            {/* Seção do WhatsApp - com highlight para onboarding */}
            <OnboardingHighlight targetId="whatsapp-section">
              <WhatsAppSection />
            </OnboardingHighlight>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default DashboardPage;
