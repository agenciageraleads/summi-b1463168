
import { useState, useEffect, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useProfile } from '@/hooks/useProfile';
import { 
  createInstanceWithWebhook, 
  getQRCode, 
  getConnectionStatus, 
  logoutInstance 
} from '@/services/evolutionApiV2';

interface ConnectionManagerProps {
  onStatusChange?: (status: string) => void;
  onQRCodeChange?: (qrCode: string | null) => void;
}

type ConnectionStatus = 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED';

export const ConnectionManager = ({ onStatusChange, onQRCodeChange }: ConnectionManagerProps) => {
  const { profile, updateProfile } = useProfile();
  const { toast } = useToast();
  
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('DISCONNECTED');
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [polling, setPolling] = useState(false);
  
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pollingStartTimeRef = useRef<number>(0);

  // Limpar polling ao desmontar
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  // Gerar nome da instância baseado no perfil
  const generateInstanceName = () => {
    if (!profile?.nome || !profile?.numero) return '';
    
    const nome = profile.nome.toLowerCase().replace(/[^a-z0-9]/g, '');
    const ultimosDigitos = profile.numero.slice(-4);
    return `${nome}_${ultimosDigitos}`;
  };

  // Iniciar polling de status
  const startStatusPolling = (instanceName: string) => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    setPolling(true);
    pollingStartTimeRef.current = Date.now();

    pollingIntervalRef.current = setInterval(async () => {
      try {
        const result = await getConnectionStatus(instanceName);
        
        if (result.success && result.status === 'OPEN') {
          // Conexão estabelecida
          setConnectionStatus('CONNECTED');
          setQrCode(null);
          setPolling(false);
          
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
          }

          onStatusChange?.('CONNECTED');
          onQRCodeChange?.(null);

          toast({
            title: 'WhatsApp Conectado!',
            description: 'Sua instância está conectada e funcionando'
          });

        } else {
          // Verificar se passou muito tempo (mais de 30 segundos)
          const elapsedTime = Date.now() - pollingStartTimeRef.current;
          if (elapsedTime > 30000) {
            console.log('[Connection Manager] Timeout atingido, parando polling');
            
            setPolling(false);
            if (pollingIntervalRef.current) {
              clearInterval(pollingIntervalRef.current);
            }

            toast({
              title: 'Timeout de Conexão',
              description: 'Tente gerar um novo QR Code',
              variant: 'destructive'
            });
          }
        }
      } catch (error) {
        console.error('[Connection Manager] Erro no polling:', error);
      }
    }, 4000); // Polling a cada 4 segundos
  };

  // Parar polling
  const stopStatusPolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }
    setPolling(false);
  };

  // Conectar WhatsApp
  const handleConnect = async () => {
    // Verificar dados do perfil
    if (!profile?.nome || !profile?.numero) {
      toast({
        title: 'Informações incompletas',
        description: 'Complete seu perfil antes de conectar o WhatsApp',
        variant: 'destructive'
      });
      return;
    }

    setIsLoading(true);
    const instanceName = generateInstanceName();

    try {
      console.log('[Connection Manager] Iniciando processo de conexão:', instanceName);

      // 1. Criar instância com webhook configurado
      setConnectionStatus('CONNECTING');
      onStatusChange?.('CONNECTING');

      const createResult = await createInstanceWithWebhook(instanceName);
      
      if (!createResult.success) {
        throw new Error(createResult.error || 'Erro ao criar instância');
      }

      // Atualizar perfil com nome da instância
      await updateProfile({ instance_name: instanceName });

      toast({
        title: 'Instância criada!',
        description: `Webhook configurado: ${createResult.webhookConfigured ? 'Sim' : 'Não'}`
      });

      // 2. Obter QR Code
      console.log('[Connection Manager] Obtendo QR Code...');
      
      const qrResult = await getQRCode(instanceName);
      
      if (!qrResult.success || !qrResult.qrCode) {
        throw new Error(qrResult.error || 'Erro ao obter QR Code');
      }

      setQrCode(qrResult.qrCode);
      onQRCodeChange?.(qrResult.qrCode);

      toast({
        title: 'QR Code gerado!',
        description: 'Escaneie o QR Code com seu WhatsApp'
      });

      // 3. Iniciar monitoramento
      startStatusPolling(instanceName);

    } catch (error) {
      console.error('[Connection Manager] Erro na conexão:', error);
      
      setConnectionStatus('DISCONNECTED');
      onStatusChange?.('DISCONNECTED');
      
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Desconectar WhatsApp
  const handleDisconnect = async () => {
    const instanceName = generateInstanceName();
    
    if (!instanceName) {
      toast({
        title: 'Erro',
        description: 'Nome da instância não encontrado',
        variant: 'destructive'
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
        description: 'WhatsApp desconectado com sucesso'
      });

    } catch (error) {
      console.error('[Connection Manager] Erro na desconexão:', error);
      
      toast({
        title: 'Erro',
        description: 'Erro ao desconectar WhatsApp',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return {
    connectionStatus,
    qrCode,
    isLoading,
    polling,
    handleConnect,
    handleDisconnect,
    generateInstanceName
  };
};
