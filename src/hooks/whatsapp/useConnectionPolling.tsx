
import { useRef, useCallback } from 'react';
import { getConnectionStatus } from '@/services/evolutionApiV2';
import { useToast } from '@/hooks/use-toast';

interface UseConnectionPollingProps {
  onStatusChange?: (status: string) => void;
  onQRCodeChange?: (qrCode: string | null) => void;
  onConnectionSuccess: () => void;
  onTimeout: (instanceName: string) => void;
}

export const useConnectionPolling = ({
  onStatusChange,
  onQRCodeChange,
  onConnectionSuccess,
  onTimeout,
}: UseConnectionPollingProps) => {
  const { toast } = useToast();
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentInstanceRef = useRef<string | null>(null);
  const timeoutCalledRef = useRef<boolean>(false);

  // Função para parar o polling de status
  const stopPolling = useCallback(() => {
    console.log('[useConnectionPolling] Parando polling...');
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    currentInstanceRef.current = null;
    timeoutCalledRef.current = false;
  }, []);

  // Função para iniciar o polling de status da conexão com timeout de 30 segundos
  const startPolling = useCallback(
    (instanceName: string) => {
      console.log('[useConnectionPolling] Iniciando polling para:', instanceName);
      stopPolling();
      currentInstanceRef.current = instanceName;
      timeoutCalledRef.current = false;

      // Configurar timeout de 30 segundos para reiniciar instância
      timeoutRef.current = setTimeout(() => {
        if (!timeoutCalledRef.current && currentInstanceRef.current === instanceName) {
          console.log('[useConnectionPolling] TIMEOUT de 30s atingido! Reiniciando instância:', instanceName);
          timeoutCalledRef.current = true;
          stopPolling();
          
          // Limpar QR Code atual antes do restart
          onQRCodeChange?.(null);
          
          // Chamar callback de timeout para iniciar restart
          onTimeout(instanceName);
        }
      }, 30000);

      // Iniciar polling a cada 4 segundos
      pollingIntervalRef.current = setInterval(async () => {
        // Verificar se o timeout já foi chamado
        if (timeoutCalledRef.current) {
          console.log('[useConnectionPolling] Timeout já foi executado, parando polling...');
          stopPolling();
          return;
        }

        try {
          console.log('[useConnectionPolling] Verificando status da instância:', instanceName);
          const result = await getConnectionStatus(instanceName);

          if (result.success && result.status === 'OPEN') {
            console.log('[useConnectionPolling] CONEXÃO ESTABELECIDA! Parando polling.');
            stopPolling();
            onConnectionSuccess();
            onStatusChange?.('CONNECTED');
            onQRCodeChange?.(null);
            toast({
              title: 'WhatsApp Conectado!',
              description: 'Sua instância está conectada e funcionando',
            });
          } else {
            console.log(`[useConnectionPolling] Status atual: ${result.status || 'UNKNOWN'} - continuando polling...`);
          }
        } catch (error) {
          console.error('[useConnectionPolling] Erro no polling:', error);
          // Não parar o polling por erro único, continuar tentando
        }
      }, 4000);
    },
    [onQRCodeChange, onStatusChange, stopPolling, toast, onConnectionSuccess, onTimeout]
  );

  return {
    startPolling,
    stopPolling,
  };
};
