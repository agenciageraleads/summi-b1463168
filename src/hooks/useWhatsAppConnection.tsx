
{
  /* 
    Este hook encapsula toda a lógica de estado e comunicação 
    com a API para gerenciar a conexão do WhatsApp.
    Inclui timeout e reinício automático de instâncias.
  */
}
import { useState, useEffect, useRef, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useProfile } from '@/hooks/useProfile';
import { supabase } from '@/integrations/supabase/client';
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
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Função para parar o polling de status
  const stopStatusPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setPolling(false);
  }, []);

  // Função para reiniciar instância quando necessário
  const restartInstance = useCallback(async (instanceName: string) => {
    console.log('[useWhatsAppConnection] Reiniciando instância por timeout:', instanceName);
    
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) throw new Error('Usuário não autenticado');

      const response = await supabase.functions.invoke('evolution-restart-instance', {
        body: { instanceName },
        headers: {
          Authorization: `Bearer ${sessionData.session.access_token}`,
        },
      });

      if (response.error) {
        console.error('[useWhatsAppConnection] Erro ao reiniciar instância:', response.error);
        throw response.error;
      }

      console.log('[useWhatsAppConnection] Instância reiniciada com sucesso');
      
      // Aguardar 3 segundos e tentar gerar novo QR Code
      setTimeout(async () => {
        console.log('[useWhatsAppConnection] Gerando novo QR Code após restart...');
        const qrResult = await getQRCode(instanceName);
        
        if (qrResult.success && qrResult.qrCode) {
          setQrCode(qrResult.qrCode);
          onQRCodeChange?.(qrResult.qrCode);
          startStatusPolling(instanceName);
          
          toast({
            title: 'Instância Reiniciada',
            description: 'Novo QR Code gerado. Escaneie novamente.',
          });
        }
      }, 3000);
      
    } catch (error) {
      console.error('[useWhatsAppConnection] Erro no restart:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível reiniciar a instância',
        variant: 'destructive',
      });
    }
  }, [onQRCodeChange, toast]);

  // Função para iniciar o polling de status da conexão com timeout
  const startStatusPolling = useCallback(
    (instanceName: string) => {
      stopStatusPolling();

      setPolling(true);
      pollingStartTimeRef.current = Date.now();

      // Configurar timeout de 30 segundos para reiniciar instância
      timeoutRef.current = setTimeout(() => {
        console.log('[useWhatsAppConnection] Timeout de 30s atingido, reiniciando instância...');
        stopStatusPolling();
        restartInstance(instanceName);
      }, 30000);

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
            // Verificar se ainda está no prazo (antes do timeout)
            const elapsedTime = Date.now() - pollingStartTimeRef.current;
            console.log(`[useWhatsAppConnection] Polling status: ${result.status}, elapsed: ${elapsedTime}ms`);
          }
        } catch (error) {
          console.error('[useWhatsAppConnection] Erro no polling:', error);
        }
      }, 4000);
    },
    [onQRCodeChange, onStatusChange, stopStatusPolling, toast, restartInstance]
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
      console.log('[useWhatsAppConnection] Iniciando processo de conexão...');
      const initResult = await initializeConnection();

      if (!initResult.success) {
        throw new Error(initResult.error || 'Erro ao inicializar conexão');
      }

      console.log('[useWhatsAppConnection] Estado inicial:', initResult.state);

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
          
          console.log('[useWhatsAppConnection] Gerando QR Code para:', initResult.instanceName);
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
      console.error('[useWhatsAppConnection] Erro na conexão:', error);
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
      console.log('[useWhatsAppConnection] Desconectando instância:', instanceName);
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
      console.error('[useWhatsAppConnection] Erro na desconexão:', error);
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
