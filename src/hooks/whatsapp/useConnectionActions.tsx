
import { useCallback } from 'react';
import { useProfile } from '@/hooks/useProfile';
import { useToast } from '@/hooks/use-toast';
import {
  initializeConnection,
  getQRCode,
  logoutInstance,
} from '@/services/evolutionApiV2';

type ConnectionStatus = 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED';

interface UseConnectionActionsProps {
  setConnectionStatus: (status: ConnectionStatus) => void;
  setQrCode: (qrCode: string | null) => void;
  setIsLoading: (loading: boolean) => void;
  onStatusChange?: (status: string) => void;
  onQRCodeChange?: (qrCode: string | null) => void;
  startPolling: (instanceName: string) => void;
  stopPolling: () => void;
}

export const useConnectionActions = ({
  setConnectionStatus,
  setQrCode,
  setIsLoading,
  onStatusChange,
  onQRCodeChange,
  startPolling,
  stopPolling,
}: UseConnectionActionsProps) => {
  const { profile } = useProfile();
  const { toast } = useToast();

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
      console.log('[useConnectionActions] Iniciando processo de conexão...');
      const initResult = await initializeConnection();

      if (!initResult.success) {
        throw new Error(initResult.error || 'Erro ao inicializar conexão');
      }

      console.log('[useConnectionActions] Estado inicial:', initResult.state);

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
          
          console.log('[useConnectionActions] Gerando QR Code para:', initResult.instanceName);
          const qrResult = await getQRCode(initResult.instanceName);

          if (!qrResult.success || !qrResult.qrCode) {
            throw new Error(qrResult.error || 'Erro ao obter QR Code');
          }

          setQrCode(qrResult.qrCode);
          onQRCodeChange?.(qrResult.qrCode);
          startPolling(initResult.instanceName);
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
          startPolling(initResult.instanceName);
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
      console.error('[useConnectionActions] Erro na conexão:', error);
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
    startPolling,
    setConnectionStatus,
    setQrCode,
    setIsLoading,
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
    stopPolling();

    try {
      console.log('[useConnectionActions] Desconectando instância:', instanceName);
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
      console.error('[useConnectionActions] Erro na desconexão:', error);
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
    stopPolling,
    onStatusChange,
    onQRCodeChange,
    setConnectionStatus,
    setQrCode,
    setIsLoading,
  ]);

  return {
    handleConnect,
    handleDisconnect,
  };
};
