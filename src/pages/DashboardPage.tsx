
import { DashboardLayout } from '@/components/Layout/DashboardLayout';
import { WhatsAppSection } from '@/components/Dashboard/WhatsAppSection';
import { ChatsList } from '@/components/Dashboard/ChatsList';
import { useNavigate } from 'react-router-dom';
import { SubscriptionStatus } from '@/components/SubscriptionStatus';

const DashboardPage = () => {
  const navigate = useNavigate();

  const handleUpgradeClick = () => {
    navigate('/subscription');
  };

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
        
        {/* Header do Dashboard */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Dashboard 📊
          </h1>
          <p className="text-muted-foreground">
            Gerencie suas conexões e monitore suas mensagens
          </p>
        </div>

        {/* Grid Principal */}
        <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
          {/* Seção do WhatsApp */}
          <WhatsAppSection />
          
          <div className="space-y-6">
            {/* Status da Assinatura */}
            <SubscriptionStatus />
          
            {/* Lista de Chats */}
            <ChatsList />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default DashboardPage;
