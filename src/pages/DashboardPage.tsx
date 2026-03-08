import { DashboardLayout } from '@/components/Layout/DashboardLayout';
import { ChatsList } from '@/components/Dashboard/ChatsList';
import { SubscriptionWarningBanner } from '@/components/Dashboard/SubscriptionWarningBanner';
import { DashboardMetricsCards } from '@/components/Dashboard/DashboardMetricsCards';
import { SEO } from "@/components/SEO";
import { Button } from '@/components/ui/button';
import { useChats } from '@/hooks/useChats';
import { useMessageAnalysis } from '@/hooks/useMessageAnalysis';
import { useProfile } from '@/hooks/useProfile';
import { Link } from 'react-router-dom';
import { useTranslation } from "react-i18next";

const DashboardPage = () => {
  const { t } = useTranslation();
  const { profile } = useProfile();
  const { chats, isLoading, fetchChats, deleteChat, deleteAllChats } = useChats();
  const { isAnalyzing, startAnalysis } = useMessageAnalysis();

  const handleAnalyzeMessages = () => {
    startAnalysis(() => {
      fetchChats();
    });
  };

  return (
    <DashboardLayout>
      <SEO
        title={t('blog_summi')}
        description={t('blog_desc')}
        keywords="blog whatsapp business, dicas whatsapp, produtividade whatsapp, ia whatsapp, automacao whatsapp"
        canonicalPath="/blog"
        author="Summi"
      />
      <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight">{t('dashboard')}</h1>
            <p className="text-muted-foreground">
              {t('dashboard_desc')}
            </p>
          </div>

          <Button asChild variant="outline">
            <Link to="/settings?tab=connection">{t('configure_whatsapp')}</Link>
          </Button>
        </div>

        {/* Aviso de cancelamento pendente */}
        <SubscriptionWarningBanner />

        <div id="onboarding-dashboard-results" className="space-y-6">
          <DashboardMetricsCards chats={chats} profile={profile} isLoading={isLoading} />
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
