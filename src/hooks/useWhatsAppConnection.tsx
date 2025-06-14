
import { useState, useEffect, useCallback, useRef } from 'react';
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
  
  // Ref para controlar se o componente está montado
  const isMountedRef = useRef(true);

  // Função para resetar completamente o estado
  const resetConnectionState = useCallback(() => {
    console.log('[useWhatsAppConnection] RESETANDO estado completo da conexão');
    if (!isMountedRef.current) return;
    
    setConnectionStatus('DISCONNECTED');
    setQrCode(null);
    setIsLoading(false);
    setPolling(false);
    onStatusChange?.('DISCONNECTED');
    onQRCodeChange?.(null);
  }, [onStatusChange, onQRCodeChange]);

  // Hook para gerenciar restart de instância
  const { restartInstance } = useInstanceRestart({
    onQRCodeChange: (qrCode) => {
      if (!isMountedRef.current) return;
      console.log('[useWhatsAppConnection] QR Code recebido do restart:', qrCode ? 'SIM' : 'NÃO');
      setQrCode(qrCode);
      onQRCodeChange?.(qrCode);
    },
    onRestartComplete: (instanceName: string) => {
      if (!isMountedRef.current) return;
      console.log('[useWhatsAppConnection] Restart completo, reiniciando polling para:', instanceName);
      // Aguardar um pouco antes de reiniciar o polling para dar tempo da instância se estabilizar
      setTimeout(() => {
        if (isMountedRef.current) {
          startPolling(instanceName);
        }
      }, 2000);
    },
  });

  // Hook para gerenciar polling de status
  const { startPolling: startStatusPolling, stopPolling } = useConnectionPolling({
    onStatusChange,
    onQRCodeChange: (qrCode) => {
      if (!isMountedRef.current) return;
      setQrCode(qrCode);
      onQRCodeChange?.(qrCode);
    },
    onConnectionSuccess: () => {
      if (!isMountedRef.current) return;
      console.log('[useWhatsAppConnection] CONEXÃO BEM-SUCEDIDA!');
      setConnectionStatus('CONNECTED');
      setQrCode(null);
      setPolling(false);
    },
    onTimeout: (instanceName: string) => {
      if (!isMountedRef.current) return;
      console.log('[useWhatsAppConnection] TIMEOUT! Iniciando processo de restart para:', instanceName);
      setPolling(false);
      // Chamar restart da instância
      restartInstance(instanceName);
    },
  });

  // Wrapper para controlar o estado de polling
  const startPolling = useCallback((instanceName: string) => {
    if (!isMountedRef.current) return;
    console.log('[useWhatsAppConnection] Iniciando polling wrapper para:', instanceName);
    setPolling(true);
    startStatusPolling(instanceName);
  }, [startStatusPolling]);

  // Wrapper para parar polling
  const stopPollingWrapper = useCallback(() => {
    console.log('[useWhatsAppConnection] Parando polling via wrapper');
    setPolling(false);
    stopPolling();
  }, [stopPolling]);

  // Hook para ações de conexão
  const { handleConnect, handleDisconnect } = useConnectionActions({
    setConnectionStatus,
    setQrCode,
    setIsLoading,
    onStatusChange,
    onQRCodeChange,
    startPolling,
    stopPolling: stopPollingWrapper,
    resetConnectionState, // Passar função de reset
  });

  // Função para forçar reconexão (útil quando instância é deletada externamente)
  const forceReconnect = useCallback(() => {
    console.log('[useWhatsAppConnection] FORÇANDO RECONEXÃO - resetando tudo');
    stopPollingWrapper();
    resetConnectionState();
    // Aguardar um momento e tentar conectar novamente
    setTimeout(() => {
      if (isMountedRef.current) {
        handleConnect();
      }
    }, 1000);
  }, [stopPollingWrapper, resetConnectionState, handleConnect]);

  // Efeito para limpar tudo quando o componente é desmontado
  useEffect(() => {
    return () => {
      console.log('[useWhatsAppConnection] Desmontando componente - limpando tudo');
      isMountedRef.current = false;
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
    forceReconnect, // Nova função para forçar reconexão
    resetConnectionState, // Expor função de reset
  };
};
