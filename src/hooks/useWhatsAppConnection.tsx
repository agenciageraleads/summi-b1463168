
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
    onQRCodeChange: (qrCode) => {
      console.log('[useWhatsAppConnection] QR Code recebido do restart:', qrCode ? 'SIM' : 'NÃO');
      setQrCode(qrCode);
      onQRCodeChange?.(qrCode);
    },
    onRestartComplete: (instanceName: string) => {
      console.log('[useWhatsAppConnection] Restart completo, reiniciando polling para:', instanceName);
      // Aguardar um pouco antes de reiniciar o polling para dar tempo da instância se estabilizar
      setTimeout(() => {
        startPolling(instanceName);
      }, 2000);
    },
  });

  // Hook para gerenciar polling de status
  const { startPolling: startStatusPolling, stopPolling } = useConnectionPolling({
    onStatusChange,
    onQRCodeChange: (qrCode) => {
      setQrCode(qrCode);
      onQRCodeChange?.(qrCode);
    },
    onConnectionSuccess: () => {
      console.log('[useWhatsAppConnection] CONEXÃO BEM-SUCEDIDA!');
      setConnectionStatus('CONNECTED');
      setQrCode(null);
      setPolling(false);
    },
    onTimeout: (instanceName: string) => {
      console.log('[useWhatsAppConnection] TIMEOUT! Iniciando processo de restart para:', instanceName);
      setPolling(false);
      // Chamar restart da instância
      restartInstance(instanceName);
    },
  });

  // Wrapper para controlar o estado de polling
  const startPolling = useCallback((instanceName: string) => {
    console.log('[useWhatsAppConnection] Iniciando polling wrapper para:', instanceName);
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
      console.log('[useWhatsAppConnection] Parando polling via wrapper');
      setPolling(false);
      stopPolling();
    },
  });

  // Efeito para limpar o polling quando o componente é desmontado
  useEffect(() => {
    return () => {
      console.log('[useWhatsAppConnection] Limpando polling no unmount');
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
