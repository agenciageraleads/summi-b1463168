
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DashboardLayout } from '@/components/Layout/DashboardLayout';
import type { Profile } from '@/hooks/useProfile';
import { useProfile } from '@/hooks/useProfile';
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
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
          <p className="text-muted-foreground">
            Gerencie suas configurações de perfil e conta.
          </p>
        </div>

        <Tabs
          value={activeTab}
          onValueChange={(value) => {
            const next = new URLSearchParams(searchParams);
            next.set('tab', value);
            setSearchParams(next, { replace: true });
          }}
          className="space-y-4"
        >
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="connection">Conexão</TabsTrigger>
            <TabsTrigger value="config">Configurações</TabsTrigger>
            <TabsTrigger value="account">Conta</TabsTrigger>
          </TabsList>

          <TabsContent value="connection" className="space-y-6">
            <ConnectionInfoForm profile={profile} onSave={handleSaveProfile} isUpdating={isUpdating} />
            <Card id="onboarding-settings-whatsapp">
              <CardHeader>
                <CardTitle>Status e conexão</CardTitle>
                <CardDescription>Conecte ou desconecte seu WhatsApp.</CardDescription>
              </CardHeader>
              <CardContent>
                <WhatsAppConnectionManager />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="config" className="space-y-6">
            <ThemesForm profile={profile} onSave={handleSaveProfile} isUpdating={isUpdating} />
            <PreferencesForm profile={profile} onSave={handleSaveProfile} isUpdating={isUpdating} />
          </TabsContent>

          <TabsContent value="account" className="space-y-6">
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
