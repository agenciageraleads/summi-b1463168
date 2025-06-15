
import { useState, useEffect, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useProfile } from '@/hooks/useProfile';
import { initializeWhatsAppConnection, generateQRCode, checkConnectionStatus, disconnectWhatsApp } from '@/services/whatsappConnection';

// Estados possíveis da conexão
type ConnectionState = 
  | 'needs_phone_number'    // Precisa configurar telefone
  | 'needs_qr_code'         // Precisa gerar/escanear QR code
  | 'is_connecting'         // Conectando/aguardando QR code
  | 'already_connected'     // Já conectado
  | 'error';                // Erro

// Interface do estado do manager
interface WhatsAppState {
  connectionState: ConnectionState;
  isLoading: boolean;
  isPolling: boolean;
  qrCode: string | null;
  message: string;
  instanceName: string | null;
}

export const useWhatsAppManager = () => {
  const { toast } = useToast();
  const { profile, updateProfile } = useProfile();
  
  // Estado principal
  const [state, setState] = useState<WhatsAppState>({
    connectionState: 'needs_phone_number',
    isLoading: false,
    isPolling: false,
    qrCode: null,
    message: 'Configure seu número de telefone primeiro',
    instanceName: null
  });

  // Refs para controle de polling
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const isPollingRef = useRef(false);

  // Função para gerar nome da instância baseado no perfil
  const generateInstanceName = () => {
    if (!profile?.nome || !profile?.numero) return null;
    
    const nome = profile.nome
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove acentos
      .replace(/[^a-z0-9]/g, '') // Remove caracteres especiais
      .substring(0, 12);
    
    const ultimosDigitos = profile.numero.slice(-4);
    return `${nome}_${ultimosDigitos}`;
  };

  // Função para atualizar estado
  const updateState = (updates: Partial<WhatsAppState>) => {
    setState(prev => ({ ...prev, ...updates }));
  };

  // Função para parar polling
  const stopPolling = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    isPollingRef.current = false;
    updateState({ isPolling: false });
  };

  // Função para iniciar polling de status
  const startPolling = (instanceName: string) => {
    if (isPollingRef.current) return; // Já está fazendo polling
    
    isPollingRef.current = true;
    updateState({ isPolling: true });
    
    pollingRef.current = setInterval(async () => {
      try {
        const statusResult = await checkConnectionStatus(instanceName);
        
        if (statusResult.success && statusResult.status === 'open') {
          // Conectado com sucesso!
          stopPolling();
          updateState({
            connectionState: 'already_connected',
            qrCode: null,
            message: 'WhatsApp conectado com sucesso!'
          });
          
          toast({
            title: 'WhatsApp Conectado!',
            description: 'Sua conexão foi estabelecida com sucesso.',
          });
          
          // Salvar instance_name no perfil se ainda não estiver salvo
          if (!profile?.instance_name) {
            await updateProfile({ instance_name: instanceName });
          }
        }
      } catch (error) {
        console.error('[WhatsApp Manager] Erro no polling:', error);
        // Continua tentando...
      }
    }, 4000); // Verifica a cada 4 segundos
  };

  // Função principal para conectar
  const handleConnect = async () => {
    try {
      updateState({ isLoading: true, qrCode: null });

      // 1. Verificar se tem dados necessários
      if (!profile?.nome || !profile?.numero) {
        updateState({
          connectionState: 'needs_phone_number',
          message: 'Complete seu perfil nas configurações primeiro',
          isLoading: false
        });
        return;
      }

      // 2. Gerar nome da instância
      const instanceName = generateInstanceName();
      if (!instanceName) {
        throw new Error('Não foi possível gerar nome da instância');
      }

      updateState({ 
        instanceName,
        message: 'Inicializando conexão...' 
      });

      // 3. Inicializar conexão
      const initResult = await initializeWhatsAppConnection();
      
      if (!initResult.success) {
        throw new Error(initResult.error || 'Erro ao inicializar conexão');
      }

      // 4. Tratar resultado da inicialização
      if (initResult.state === 'already_connected') {
        updateState({
          connectionState: 'already_connected',
          message: 'WhatsApp já está conectado!',
          isLoading: false
        });
        return;
      }

      // 5. Gerar QR Code
      updateState({ message: 'Gerando QR Code...' });
      
      const qrResult = await generateQRCode(instanceName);
      
      if (!qrResult.success) {
        if (qrResult.error?.includes('already connected')) {
          updateState({
            connectionState: 'already_connected',
            message: 'WhatsApp já está conectado!',
            isLoading: false
          });
          return;
        }
        throw new Error(qrResult.error || 'Erro ao gerar QR Code');
      }

      // 6. QR Code gerado com sucesso
      updateState({
        connectionState: 'is_connecting',
        qrCode: qrResult.qrCode || null,
        message: 'Escaneie o QR Code com seu WhatsApp',
        isLoading: false
      });

      // 7. Iniciar monitoramento
      startPolling(instanceName);

      toast({
        title: 'QR Code gerado!',
        description: 'Escaneie o código com seu WhatsApp para conectar.',
      });

    } catch (error) {
      console.error('[WhatsApp Manager] Erro ao conectar:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      
      updateState({
        connectionState: 'error',
        message: errorMessage,
        isLoading: false,
        qrCode: null
      });

      toast({
        title: 'Erro na conexão',
        description: errorMessage,
        variant: 'destructive'
      });
    }
  };

  // Função para desconectar
  const handleDisconnect = async () => {
    try {
      updateState({ isLoading: true });
      stopPolling();

      const result = await disconnectWhatsApp();
      
      if (result.success) {
        updateState({
          connectionState: 'needs_qr_code',
          message: 'WhatsApp desconectado. Você pode reconectar quando quiser.',
          isLoading: false,
          qrCode: null
        });

        toast({
          title: 'Desconectado',
          description: 'WhatsApp foi desconectado com sucesso.',
        });
      } else {
        throw new Error(result.error || 'Erro ao desconectar');
      }
    } catch (error) {
      console.error('[WhatsApp Manager] Erro ao desconectar:', error);
      
      updateState({ isLoading: false });
      
      toast({
        title: 'Erro',
        description: 'Erro ao desconectar WhatsApp',
        variant: 'destructive'
      });
    }
  };

  // Efeito para verificar status inicial
  useEffect(() => {
    const checkInitialStatus = async () => {
      if (!profile) return;

      // Se não tem dados básicos, precisa configurar
      if (!profile.nome || !profile.numero) {
        updateState({
          connectionState: 'needs_phone_number',
          message: 'Configure seu perfil nas configurações primeiro'
        });
        return;
      }

      // Se tem instance_name, verificar status
      if (profile.instance_name) {
        try {
          updateState({ message: 'Verificando status da conexão...' });
          
          const statusResult = await checkConnectionStatus(profile.instance_name);
          
          if (statusResult.success && statusResult.status === 'open') {
            updateState({
              connectionState: 'already_connected',
              message: 'WhatsApp conectado e funcionando',
              instanceName: profile.instance_name
            });
          } else {
            updateState({
              connectionState: 'needs_qr_code',
              message: 'Gere um novo QR Code para conectar',
              instanceName: profile.instance_name
            });
          }
        } catch (error) {
          console.error('[WhatsApp Manager] Erro ao verificar status inicial:', error);
          updateState({
            connectionState: 'needs_qr_code',
            message: 'Clique em conectar para gerar um QR Code'
          });
        }
      } else {
        // Não tem instance_name, pode conectar
        updateState({
          connectionState: 'needs_qr_code',
          message: 'Clique em conectar para gerar um QR Code'
        });
      }
    };

    checkInitialStatus();
  }, [profile]);

  // Limpeza ao desmontar
  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, []);

  return {
    state,
    handleConnect,
    handleDisconnect
  };
};
