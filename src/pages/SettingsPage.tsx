
import { DashboardLayout } from '@/components/Layout/DashboardLayout';
import { useProfile } from '@/hooks/useProfile';
import { ProfileForm } from '@/components/Settings/ProfileForm';
import { AccountDeletion } from '@/components/Settings/AccountDeletion';
import { SubscriptionStatus } from '@/components/SubscriptionStatus';
import { WhatsAppConnectionManager } from '@/components/Dashboard/WhatsAppConnectionManager';
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const SettingsPage = () => {
  const { profile, isLoading, updateProfile, refreshProfile } = useProfile();
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();

  // Listener global para mensagens do Google Calendar
  useEffect(() => {
    const handleGoogleCalendarMessage = async (event: MessageEvent) => {
      if (event.data.type === 'GOOGLE_CALENDAR_SUCCESS') {
        console.log('[SETTINGS_PAGE] Google Calendar success detected, refreshing profile...');
        
        // Pequeno delay para garantir que o backend processou tudo
        setTimeout(async () => {
          try {
            await refreshProfile();
            toast({
              title: "Conectado!",
              description: "Google Calendar conectado e dados atualizados automaticamente.",
            });
          } catch (error) {
            console.error('[SETTINGS_PAGE] Error refreshing profile:', error);
          }
        }, 1000);
      }
    };

    window.addEventListener('message', handleGoogleCalendarMessage);
    
    return () => {
      window.removeEventListener('message', handleGoogleCalendarMessage);
    };
  }, [refreshProfile, toast]);

  // Função para salvar as alterações do perfil
  const handleSaveProfile = async (data: Partial<typeof profile>) => {
    setIsUpdating(true);
    try {
      await updateProfile(data);
    } finally {
      setIsUpdating(false);
    }
  };

  // Função para refresh do perfil (passa para componentes filhos)
  const handleRefreshProfile = async () => {
    try {
      await refreshProfile();
    } catch (error) {
      console.error('[SETTINGS_PAGE] Error in handleRefreshProfile:', error);
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

        {/* Formulário de perfil */}
        <ProfileForm 
          profile={profile}
          onSave={handleSaveProfile}
          isUpdating={isUpdating}
          onRefreshProfile={handleRefreshProfile}
        />

        {/* Conexão WhatsApp */}
        <Card>
          <CardHeader>
            <CardTitle>Conexão WhatsApp</CardTitle>
            <CardDescription>
              Conecte seu WhatsApp para começar a receber resumos e transcrições
            </CardDescription>
          </CardHeader>
          <CardContent>
            <WhatsAppConnectionManager />
          </CardContent>
        </Card>
        
        {/* Status da assinatura */}
        <SubscriptionStatus />
        
        {/* Exclusão de conta */}
        <AccountDeletion />
      </div>
    </DashboardLayout>
  );
};

export default SettingsPage;
