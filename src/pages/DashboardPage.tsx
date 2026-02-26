import { DashboardLayout } from '@/components/Layout/DashboardLayout';
import { ChatsList } from '@/components/Dashboard/ChatsList';
import { SubscriptionWarningBanner } from '@/components/Dashboard/SubscriptionWarningBanner';
import { DashboardMetricsCards } from '@/components/Dashboard/DashboardMetricsCards';
import { Button } from '@/components/ui/button';
import { useChats } from '@/hooks/useChats';
import { useMessageAnalysis } from '@/hooks/useMessageAnalysis';
import { Link } from 'react-router-dom';

const DashboardPage = () => {
  const { chats, isLoading, fetchChats, deleteChat, deleteAllChats } = useChats();
  const { isAnalyzing, startAnalysis } = useMessageAnalysis();

  const handleAnalyzeMessages = () => {
    startAnalysis(() => {
      fetchChats();
    });
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground">
              Acompanhe suas conversas priorizadas e os resultados da análise.
            </p>
          </div>

          <Button asChild variant="outline">
            <Link to="/settings?tab=connection">Configurar WhatsApp</Link>
          </Button>
        </div>

        {/* Aviso de cancelamento pendente */}
        <SubscriptionWarningBanner />

        <div id="onboarding-dashboard-results" className="space-y-6">
          <DashboardMetricsCards chats={chats} isLoading={isLoading} />
          <ChatsList
            chats={chats}
            isLoading={isLoading}
            isAnalyzing={isAnalyzing}
            onAnalyzeMessages={handleAnalyzeMessages}
            onDeleteChat={deleteChat}
            onDeleteAllChats={deleteAllChats}
          />
        </div>
      </div>
    </DashboardLayout>
  );
};

export default DashboardPage;
