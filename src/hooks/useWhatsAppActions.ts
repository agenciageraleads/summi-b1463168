
import { useCallback } from 'react';

import type { ConnectionState, WhatsAppManagerState } from './useWhatsAppManager';

interface UseWhatsAppActionsProps {
  setState: React.Dispatch<React.SetStateAction<WhatsAppManagerState>>;
  stopPolling: () => void;
  refreshProfile: () => Promise<void>;
  toast: any;
  checkConnectionAndUpdate: (instanceName: string) => Promise<boolean>;
  handleGenerateQR: (instanceName: string) => Promise<void>;
  initializeConnection: () => Promise<void>;
  profile: any;
  state: WhatsAppManagerState;
}

// Esse hook serve apenas para reunir as ações de usuário do WhatsAppManager
export const useWhatsAppActions = ({
  setState,
  stopPolling,
  refreshProfile,
  toast,
  checkConnectionAndUpdate,
  handleGenerateQR,
  initializeConnection,
  profile,
  state
}: UseWhatsAppActionsProps) => {
  
  // Ação principal: conectar WhatsApp
  const handleConnect = useCallback(async () => {
    if (!profile?.numero) {
      toast({
        title: 'Informações incompletas',
        description: 'Configure seu número de telefone no perfil antes de conectar.',
        variant: 'destructive',
      });
      return;
    }

    if (state.isLoading) return;
    stopPolling();

    setState(prev => ({
      ...prev,
      isLoading: true,
      connectionState: 'is_connecting',
      message: 'Conectando...',
      qrCode: null
    }));

    if (profile.instance_name) {
      const isAlreadyConnected = await checkConnectionAndUpdate(profile.instance_name);
      if (isAlreadyConnected) return;
      await handleGenerateQR(profile.instance_name);
    } else {
      await initializeConnection();
      await refreshProfile();
    }
  }, [profile, toast, stopPolling, state.isLoading, checkConnectionAndUpdate, handleGenerateQR, refreshProfile, initializeConnection, setState]);

  return { handleConnect };
};
