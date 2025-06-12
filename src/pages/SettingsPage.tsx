
import { useState } from 'react';
import { DashboardLayout } from '@/components/Layout/DashboardLayout';
import { useProfile } from '@/hooks/useProfile';
import { ProfileForm } from '@/components/Settings/ProfileForm';
import { AccountDeletion } from '@/components/Settings/AccountDeletion';

const SettingsPage = () => {
  const { profile, isLoading, updateProfile } = useProfile();
  const [isUpdating, setIsUpdating] = useState(false);

  const handleProfileSave = async (data: any) => {
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
      <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Configurações ⚙️
          </h1>
          <p className="text-muted-foreground">
            Gerencie seu perfil e configurações da Summi
          </p>
        </div>

        {/* Profile Form */}
        <ProfileForm 
          profile={profile}
          onSave={handleProfileSave}
          isUpdating={isUpdating}
        />

        {/* Account Deletion */}
        <AccountDeletion />
      </div>
    </DashboardLayout>
  );
};

export default SettingsPage;
