
import { DashboardLayout } from '@/components/Layout/DashboardLayout';
import { TrialBanner } from '@/components/TrialBanner';
import { WhatsAppSection } from '@/components/Dashboard/WhatsAppSection';
import { ChatsList } from '@/components/Dashboard/ChatsList';
import { useNavigate } from 'react-router-dom';

const DashboardPage = () => {
  const navigate = useNavigate();

  const handleUpgradeClick = () => {
    navigate('/subscription');
  };

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
        {/* Banner de Trial */}
        <TrialBanner onUpgradeClick={handleUpgradeClick} />

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
          
          {/* Lista de Chats */}
          <ChatsList />
        </div>
      </div>
    </DashboardLayout>
  );
};

export default DashboardPage;
