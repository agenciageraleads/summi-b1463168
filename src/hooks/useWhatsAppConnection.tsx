
import { useState, useEffect, useCallback } from 'react';
import { useConnectionPolling } from '@/hooks/whatsapp/useConnectionPolling';
import { useInstanceRestart } from '@/hooks/whatsapp/useInstanceRestart';
import { useConnectionActions } from '@/hooks/whatsapp/useConnectionActions';

interface UseWhatsAppConnectionProps {
  onStatusChange?: (status: string) => void;
  onQRCodeChange?: (qrCode: string | null) => void;
}

type ConnectionStatus = 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED';

export const useWhatsAppConnection = ({
  onStatusChange,
  onQRCodeChange,
}: UseWhatsAppConnectionProps = {}) => {
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>('DISCONNECTED');
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [polling, setPolling] = useState(false);

  // Hook para gerenciar restart de instância
  const { restartInstance } = useInstanceRestart({
    onQRCodeChange,
    onRestartComplete: (instanceName: string) => {
      startPolling(instanceName);
    },
  });

  // Hook para gerenciar polling de status
  const { startPolling: startStatusPolling, stopPolling } = useConnectionPolling({
    onStatusChange,
    onQRCodeChange,
    onConnectionSuccess: () => {
      setConnectionStatus('CONNECTED');
      setQrCode(null);
      setPolling(false);
    },
    onTimeout: (instanceName: string) => {
      setPolling(false);
      restartInstance(instanceName);
    },
  });

  // Wrapper para controlar o estado de polling
  const startPolling = useCallback((instanceName: string) => {
    setPolling(true);
    startStatusPolling(instanceName);
  }, [startStatusPolling]);

  // Hook para ações de conexão
  const { handleConnect, handleDisconnect } = useConnectionActions({
    setConnectionStatus,
    setQrCode,
    setIsLoading,
    onStatusChange,
    onQRCodeChange,
    startPolling,
    stopPolling: () => {
      setPolling(false);
      stopPolling();
    },
  });

  // Efeito para limpar o polling quando o componente é desmontado
  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, [stopPolling]);

  return {
    connectionStatus,
    qrCode,
    isLoading,
    polling,
    handleConnect,
    handleDisconnect,
  };
};
