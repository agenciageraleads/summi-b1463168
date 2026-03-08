import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DashboardLayout } from '@/components/Layout/DashboardLayout';
import type { Profile } from '@/hooks/useProfile';
import { useProfile } from '@/hooks/useProfile';
import { useTranslation } from 'react-i18next';
import { SEO } from '@/components/SEO';
import { User, Smartphone, Key, Shield } from 'lucide-react';
import { SetupProgressBanner } from '@/components/Settings/SetupProgressBanner';
import { AccountDeletion } from '@/components/Settings/AccountDeletion';
import { SubscriptionStatus } from '@/components/SubscriptionStatus';
import { WhatsAppConnectionManager } from '@/components/Dashboard/WhatsAppConnectionManager';
import { PreferencesForm } from '@/components/Settings/PreferencesForm';
import { ConnectionInfoForm } from '@/components/Settings/ConnectionInfoForm';
import { ThemesForm } from '@/components/Settings/ThemesForm';
import { PasswordResetCard } from '@/components/Settings/PasswordResetCard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const SettingsPage = () => {
  const { t } = useTranslation();
  const { profile, isLoading, updateProfile } = useProfile();
  const [isUpdating, setIsUpdating] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  const tabParam = searchParams.get('tab');
  const isValidTab = (value: string | null): value is 'connection' | 'config' | 'account' =>
    value === 'connection' || value === 'config' || value === 'account';
  const activeTab = isValidTab(tabParam) ? tabParam : 'connection';

  useEffect(() => {
    if (tabParam && !isValidTab(tabParam)) {
      const next = new URLSearchParams(searchParams);
      next.set('tab', 'connection');
      setSearchParams(next, { replace: true });
    }
  }, [tabParam, searchParams, setSearchParams]);

  // Função para salvar as alterações do perfil
  const handleSaveProfile = async (data: Partial<Profile>) => {
    setIsUpdating(true);
    try {
      await updateProfile(data);
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!profile) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <p className="text-muted-foreground">Erro ao carregar perfil</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <SEO
        title={t('settings_title')}
        description={t('settings_page_desc')}
        author="Summi"
      />
      <div className="space-y-6">
        <SetupProgressBanner
          whatsappConnected={!!profile.numero && !!profile.instance_name}
          hasPreferencesSet={!!profile.onboarding_completed}
          onGoToWhatsApp={() => setSearchParams({ tab: 'connection' })}
          onGoToPreferences={() => setSearchParams({ tab: 'config' })}
        />

        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('settings_title')}</h1>
          <p className="text-muted-foreground">
            {t('settings_page_subtitle')}
          </p>
        </div>

        <Tabs
          value={activeTab}
          onValueChange={(value) => {
            const next = new URLSearchParams(searchParams);
            next.set('tab', value);
            setSearchParams(next, { replace: true });
          }}>
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 mb-8">
            <TabsTrigger value="connection">
              <User className="h-4 w-4 mr-2" />
              {t('connection')}
            </TabsTrigger>
            <TabsTrigger value="config">
              <Smartphone className="h-4 w-4 mr-2" />
              {t('config')}
            </TabsTrigger>
            <TabsTrigger value="account">
              <Key className="h-4 w-4 mr-2" />
              {t('account')}
            </TabsTrigger>
            <TabsTrigger value="security">
              <Shield className="h-4 w-4 mr-2" />
              {t('security')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="connection" className="space-y-6">
            <h2 className="sr-only">{t('connection_settings_heading')}</h2>
            <ConnectionInfoForm profile={profile} onSave={handleSaveProfile} isUpdating={isUpdating} />
            <Card id="onboarding-settings-whatsapp">
              <CardHeader>
                <h2 className="text-xl font-semibold">{t('status_and_connection')}</h2>
                <CardDescription>{t('connect_disconnect_whatsapp_desc')}</CardDescription>
              </CardHeader>
              <CardContent>
                <WhatsAppConnectionManager />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="config" className="space-y-6">
            <h2 className="sr-only">{t('config_settings_heading')}</h2>
            <ThemesForm profile={profile} onSave={handleSaveProfile} isUpdating={isUpdating} />
            <PreferencesForm profile={profile} onSave={handleSaveProfile} isUpdating={isUpdating} />
          </TabsContent>

          <TabsContent value="account" className="space-y-6">
            <h2 className="sr-only">{t('account_settings_heading')}</h2>
            <PasswordResetCard />
            <SubscriptionStatus />
            <AccountDeletion />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default SettingsPage;
