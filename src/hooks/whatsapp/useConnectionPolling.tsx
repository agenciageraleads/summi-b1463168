
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
  const pollingStartTimeRef = useRef<number>(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Função para parar o polling de status
  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  // Função para iniciar o polling de status da conexão com timeout
  const startPolling = useCallback(
    (instanceName: string) => {
      stopPolling();
      pollingStartTimeRef.current = Date.now();

      // Configurar timeout de 30 segundos para reiniciar instância
      timeoutRef.current = setTimeout(() => {
        console.log('[useConnectionPolling] Timeout de 30s atingido, reiniciando instância...');
        stopPolling();
        onTimeout(instanceName);
      }, 30000);

      pollingIntervalRef.current = setInterval(async () => {
        try {
          const result = await getConnectionStatus(instanceName);

          if (result.success && result.status === 'OPEN') {
            stopPolling();
            onConnectionSuccess();
            onStatusChange?.('CONNECTED');
            onQRCodeChange?.(null);
            toast({
              title: 'WhatsApp Conectado!',
              description: 'Sua instância está conectada e funcionando',
            });
          } else {
            // Verificar se ainda está no prazo (antes do timeout)
            const elapsedTime = Date.now() - pollingStartTimeRef.current;
            console.log(`[useConnectionPolling] Polling status: ${result.status}, elapsed: ${elapsedTime}ms`);
          }
        } catch (error) {
          console.error('[useConnectionPolling] Erro no polling:', error);
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
