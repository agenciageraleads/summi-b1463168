
{
  /* 
    Este hook encapsula toda a lógica de estado e comunicação 
    com a API para gerenciar a conexão do WhatsApp.
  */
}
import { useState, useEffect, useRef, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useProfile } from '@/hooks/useProfile';
import {
  initializeConnection,
  getQRCode,
  getConnectionStatus,
  logoutInstance,
} from '@/services/evolutionApiV2';

interface UseWhatsAppConnectionProps {
  onStatusChange?: (status: string) => void;
  onQRCodeChange?: (qrCode: string | null) => void;
}

type ConnectionStatus = 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED';

export const useWhatsAppConnection = ({
  onStatusChange,
  onQRCodeChange,
}: UseWhatsAppConnectionProps = {}) => {
  const { profile } = useProfile();
  const { toast } = useToast();

  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>('DISCONNECTED');
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [polling, setPolling] = useState(false);

  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pollingStartTimeRef = useRef<number>(0);

  // Função para parar o polling de status
  const stopStatusPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }
    setPolling(false);
  }, []);

  // Função para iniciar o polling de status da conexão
  const startStatusPolling = useCallback(
    (instanceName: string) => {
      stopStatusPolling();

      setPolling(true);
      pollingStartTimeRef.current = Date.now();

      pollingIntervalRef.current = setInterval(async () => {
        try {
          const result = await getConnectionStatus(instanceName);

          if (result.success && result.status === 'OPEN') {
            setConnectionStatus('CONNECTED');
            setQrCode(null);
            stopStatusPolling();
            onStatusChange?.('CONNECTED');
            onQRCodeChange?.(null);
            toast({
              title: 'WhatsApp Conectado!',
              description: 'Sua instância está conectada e funcionando',
            });
          } else {
            const elapsedTime = Date.now() - pollingStartTimeRef.current;
            if (elapsedTime > 30000) {
              console.log(
                '[useWhatsAppConnection] Timeout atingido, parando polling'
              );
              stopStatusPolling();
              toast({
                title: 'Timeout de Conexão',
                description: 'Tente gerar um novo QR Code',
                variant: 'destructive',
              });
            }
          }
        } catch (error) {
          console.error('[useWhatsAppConnection] Erro no polling:', error);
        }
      }, 4000);
    },
    [onQRCodeChange, onStatusChange, stopStatusPolling, toast]
  );

  // Efeito para limpar o polling quando o componente é desmontado
  useEffect(() => {
    return () => {
      stopStatusPolling();
    };
  }, [stopStatusPolling]);

  // Função para lidar com a conexão do WhatsApp
  const handleConnect = useCallback(async () => {
    if (!profile?.numero) {
      toast({
        title: 'Informações incompletas',
        description:
          'Configure seu número de telefone no perfil antes de conectar.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    setConnectionStatus('CONNECTING');
    onStatusChange?.('CONNECTING');

    try {
      const initResult = await initializeConnection();

      if (!initResult.success) {
        throw new Error(initResult.error || 'Erro ao inicializar conexão');
      }

      switch (initResult.state) {
        case 'needs_phone_number':
          toast({
            title: 'Telefone necessário',
            description:
              'Por favor, adicione seu número de telefone no seu perfil.',
            variant: 'destructive',
          });
          setConnectionStatus('DISCONNECTED');
          onStatusChange?.('DISCONNECTED');
          break;

        case 'already_connected':
          setConnectionStatus('CONNECTED');
          onStatusChange?.('CONNECTED');
          toast({
            title: 'Já Conectado',
            description: 'Seu WhatsApp já está conectado.',
          });
          break;

        case 'needs_qr_code':
          if (!initResult.instanceName) {
            throw new Error('Nome da instância não foi retornado pela API.');
          }
          const qrResult = await getQRCode(initResult.instanceName);

          if (!qrResult.success || !qrResult.qrCode) {
            throw new Error(qrResult.error || 'Erro ao obter QR Code');
          }

          setQrCode(qrResult.qrCode);
          onQRCodeChange?.(qrResult.qrCode);
          startStatusPolling(initResult.instanceName);
          toast({
            title: 'QR Code Gerado!',
            description: 'Escaneie o QR Code com seu WhatsApp.',
          });
          break;

        case 'is_connecting':
          if (!initResult.instanceName) {
            throw new Error('Nome da instância não foi retornado pela API.');
          }
          setConnectionStatus('CONNECTING');
          onStatusChange?.('CONNECTING');
          startStatusPolling(initResult.instanceName);
          toast({
            title: 'Conectando...',
            description: 'Sua instância está conectando, aguarde.',
          });
          break;

        case 'error':
          throw new Error(
            initResult.error || 'Ocorreu um erro na inicialização.'
          );
      }
    } catch (error) {
      setConnectionStatus('DISCONNECTED');
      onStatusChange?.('DISCONNECTED');
      toast({
        title: 'Erro de Conexão',
        description:
          error instanceof Error
            ? error.message
            : 'Ocorreu um erro desconhecido.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [
    profile?.numero,
    toast,
    onStatusChange,
    onQRCodeChange,
    startStatusPolling,
  ]);

  // Função para lidar com a desconexão do WhatsApp
  const handleDisconnect = useCallback(async () => {
    const instanceName = profile?.instance_name;

    if (!instanceName) {
      toast({
        title: 'Erro',
        description: 'Nome da instância não encontrado no seu perfil.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    stopStatusPolling();

    try {
      await logoutInstance(instanceName);

      setConnectionStatus('DISCONNECTED');
      setQrCode(null);
      onStatusChange?.('DISCONNECTED');
      onQRCodeChange?.(null);
      toast({
        title: 'Desconectado',
        description: 'WhatsApp desconectado com sucesso',
      });
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao desconectar WhatsApp',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [
    profile?.instance_name,
    toast,
    stopStatusPolling,
    onStatusChange,
    onQRCodeChange,
  ]);

  return {
    connectionStatus,
    qrCode,
    isLoading,
    polling,
    handleConnect,
    handleDisconnect,
  };
};
