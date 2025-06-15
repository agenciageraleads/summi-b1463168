import { DashboardLayout } from '@/components/Layout/DashboardLayout';
import { useProfile } from '@/hooks/useProfile';
import { ProfileForm } from '@/components/Settings/ProfileForm';
import { AccountDeletion } from '@/components/Settings/AccountDeletion';
import { SubscriptionStatus } from '@/components/Settings/SubscriptionStatus';
import ReferralSection from '@/components/Settings/ReferralSection';
import { useState } from 'react';

const SettingsPage = () => {
  const { profile, isLoading, updateProfile } = useProfile();
  const [isUpdating, setIsUpdating] = useState(false);

  // Função para salvar as alterações do perfil
  const handleSaveProfile = async (data: Partial<typeof profile>) => {
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

        {/* Seção de Indicação */}
        <ReferralSection />

        {/* Existing components */}
        <ProfileForm 
          profile={profile}
          onSave={handleSaveProfile}
          isUpdating={isUpdating}
        />
        <SubscriptionStatus />
        <AccountDeletion />
      </div>
    </DashboardLayout>
  );
};

export default SettingsPage;
