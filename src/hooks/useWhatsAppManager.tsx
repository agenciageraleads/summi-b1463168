
// Hook principal para gerenciar toda a conexão WhatsApp - VERSÃO UNIFICADA
import { useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useProfile } from '@/hooks/useProfile';
import {
  initializeWhatsAppConnection,
  generateQRCode,
  checkConnectionStatus,
  disconnectWhatsApp,
  restartInstance,
  type ConnectionResult
} from '@/services/whatsappConnection';

type ConnectionState = 'needs_phone_number' | 'needs_qr_code' | 'is_connecting' | 'already_connected' | 'error';

interface WhatsAppManagerState {
  connectionState: ConnectionState;
  isLoading: boolean;
  qrCode: string | null;
  instanceName: string | null;
  message: string;
  isPolling: boolean;
}

export const useWhatsAppManager = () => {
  const { toast } = useToast();
  const { profile, refreshProfile } = useProfile();
  
  const [state, setState] = useState<WhatsAppManagerState>({
    connectionState: 'needs_phone_number',
    isLoading: false,
    qrCode: null,
    instanceName: null,
    message: 'Verificando estado da conexão...',
    isPolling: false
  });

  // Refs para controle de timers e inicialização
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const qrTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);
  const hasInitializedRef = useRef(false);
  const isInitializingRef = useRef(false);

  // Função para determinar estado inicial baseado no perfil
  const getInitialStateFromProfile = useCallback(() => {
    console.log('[WhatsApp Manager] Determinando estado inicial do perfil:', profile);
    
    if (!profile) {
      return {
        connectionState: 'needs_phone_number' as ConnectionState,
        message: 'Carregando perfil...'
      };
    }

    if (!profile.numero) {
      return {
        connectionState: 'needs_phone_number' as ConnectionState,
        message: 'Configure seu número de telefone nas configurações'
      };
    }

    if (profile.instance_name) {
      return {
        connectionState: 'already_connected' as ConnectionState,
        message: 'WhatsApp conectado e funcionando',
        instanceName: profile.instance_name
      };
    }

    return {
      connectionState: 'needs_qr_code' as ConnectionState,
      message: 'Clique em "Conectar WhatsApp" para gerar o QR Code'
    };
  }, [profile]);

  // Limpar todos os timers
  const clearTimers = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    if (qrTimeoutRef.current) {
      clearTimeout(qrTimeoutRef.current);
      qrTimeoutRef.current = null;
    }
  }, []);

  // Parar polling
  const stopPolling = useCallback(() => {
    console.log('[WhatsApp Manager] Parando polling...');
    setState(prev => ({ ...prev, isPolling: false }));
    clearTimers();
  }, [clearTimers]);

  // Iniciar polling para verificar conexão
  const startPolling = useCallback((instanceName: string) => {
    if (!isMountedRef.current) return;
    
    console.log('[WhatsApp Manager] Iniciando polling para:', instanceName);
    setState(prev => ({ ...prev, isPolling: true }));

    // Limpar timers anteriores
    clearTimers();

    // Timer de 30 segundos para restart automático
    qrTimeoutRef.current = setTimeout(async () => {
      if (!isMountedRef.current) return;
      
      console.log('[WhatsApp Manager] Timeout de 30s - reiniciando instância...');
      setState(prev => ({ ...prev, message: 'Reiniciando instância...', qrCode: null }));
      
      const restartResult = await restartInstance(instanceName);
      if (restartResult.success) {
        // Aguardar 3 segundos e gerar novo QR
        setTimeout(async () => {
          if (isMountedRef.current) {
            await handleGenerateQR(instanceName);
          }
        }, 3000);
      } else {
        setState(prev => ({
          ...prev,
          connectionState: 'error',
          message: restartResult.error || 'Erro ao reiniciar instância',
          isLoading: false,
          isPolling: false
        }));
      }
    }, 30000);

    // Polling a cada 4 segundos
    pollingIntervalRef.current = setInterval(async () => {
      if (!isMountedRef.current) return;

      try {
        const statusResult = await checkConnectionStatus(instanceName);
        
        if (statusResult.success && statusResult.status === 'open') {
          console.log('[WhatsApp Manager] Conexão detectada!');
          
          stopPolling();
          setState(prev => ({
            ...prev,
            connectionState: 'already_connected',
            qrCode: null,
            message: 'WhatsApp conectado com sucesso!',
            isLoading: false
          }));
          
          await refreshProfile();
          
          toast({
            title: "Conectado!",
            description: "WhatsApp conectado com sucesso"
          });
        }
      } catch (error) {
        console.error('[WhatsApp Manager] Erro no polling:', error);
      }
    }, 4000);
  }, [clearTimers, stopPolling, refreshProfile, toast]);

  // Gerar QR Code
  const handleGenerateQR = useCallback(async (instanceName: string) => {
    console.log('[WhatsApp Manager] Gerando QR Code...');
    setState(prev => ({ ...prev, isLoading: true, message: 'Gerando QR Code...' }));
    
    try {
      const result = await generateQRCode(instanceName);
      
      if (result.success && result.qrCode) {
        setState(prev => ({
          ...prev,
          connectionState: 'needs_qr_code',
          qrCode: result.qrCode!,
          message: 'Escaneie o QR Code com seu WhatsApp',
          isLoading: false
        }));
        
        startPolling(instanceName);
      } else if (result.state === 'already_connected') {
        setState(prev => ({
          ...prev,
          connectionState: 'already_connected',
          message: result.message || 'WhatsApp já conectado',
          isLoading: false
        }));
        
        await refreshProfile();
      } else {
        setState(prev => ({
          ...prev,
          connectionState: 'error',
          message: result.error || 'Erro ao gerar QR Code',
          isLoading: false
        }));
      }
    } catch (error) {
      console.error('[WhatsApp Manager] Erro ao gerar QR:', error);
      setState(prev => ({
        ...prev,
        connectionState: 'error',
        message: 'Erro inesperado ao gerar QR Code',
        isLoading: false
      }));
    }
  }, [startPolling, refreshProfile]);

  // Inicializar conexão
  const initializeConnection = useCallback(async () => {
    if (isInitializingRef.current || hasInitializedRef.current) {
      console.log('[WhatsApp Manager] Inicialização já em andamento ou concluída');
      return;
    }

    isInitializingRef.current = true;
    console.log('[WhatsApp Manager] Inicializando conexão...');
    
    setState(prev => ({ 
      ...prev, 
      isLoading: true, 
      message: 'Verificando estado da conexão...' 
    }));
    
    try {
      const result = await initializeWhatsAppConnection();
      
      if (result.success) {
        setState(prev => ({
          ...prev,
          connectionState: result.state,
          instanceName: result.instanceName || null,
          message: result.message || getStateMessage(result.state),
          isLoading: false
        }));

        if (result.state === 'needs_qr_code' && result.instanceName) {
          await handleGenerateQR(result.instanceName);
        }
      } else {
        setState(prev => ({
          ...prev,
          connectionState: 'error',
          message: result.error || 'Erro ao inicializar conexão',
          isLoading: false
        }));
      }
    } catch (error) {
      console.error('[WhatsApp Manager] Erro na inicialização:', error);
      setState(prev => ({
        ...prev,
        connectionState: 'error',
        message: 'Erro inesperado ao inicializar conexão',
        isLoading: false
      }));
    } finally {
      hasInitializedRef.current = true;
      isInitializingRef.current = false;
    }
  }, [handleGenerateQR]);

  // Conectar WhatsApp
  const handleConnect = useCallback(async () => {
    console.log('[WhatsApp Manager] Tentativa de conexão iniciada');

    if (!profile?.numero) {
      toast({
        title: 'Informações incompletas',
        description: 'Configure seu número de telefone no perfil antes de conectar.',
        variant: 'destructive',
      });
      return;
    }

    if (state.isLoading) {
      console.log('[WhatsApp Manager] Já está carregando, ignorando clique');
      return;
    }

    stopPolling();

    setState(prev => ({
      ...prev,
      isLoading: true,
      connectionState: 'is_connecting',
      message: 'Conectando...',
      qrCode: null
    }));

    if (!profile.instance_name) {
      await initializeConnection();
      await refreshProfile();
    } else {
      await handleGenerateQR(profile.instance_name);
    }
  }, [profile, toast, stopPolling, state.isLoading, initializeConnection, refreshProfile, handleGenerateQR]);

  // Desconectar WhatsApp
  const handleDisconnect = useCallback(async () => {
    console.log('[WhatsApp Manager] Iniciando desconexão...');
    setState(prev => ({ ...prev, isLoading: true, message: 'Desconectando...' }));
    stopPolling();

    try {
      const result = await disconnectWhatsApp();

      if (result.success) {
        setState({
          connectionState: 'needs_phone_number',
          isLoading: false,
          qrCode: null,
          instanceName: null,
          message: result.message || 'WhatsApp desconectado com sucesso',
          isPolling: false
        });

        hasInitializedRef.current = false;
        isInitializingRef.current = false;

        await refreshProfile();

        toast({
          title: "Desconectado",
          description: "WhatsApp desconectado com sucesso"
        });
      } else {
        setState(prev => ({
          ...prev,
          message: result.error || 'Erro ao desconectar',
          isLoading: false
        }));

        if (result.error && /sessão|expirada|inválida|autentic/.test(result.error.toLowerCase())) {
          toast({
            title: "Sessão expirada",
            description: "Faça login novamente para continuar.",
            variant: "destructive"
          });
        } else {
          toast({
            title: "Erro na Desconexão",
            description: result.error || 'Erro ao desconectar WhatsApp',
            variant: "destructive"
          });
        }
      }
    } catch (error) {
      console.error('[WhatsApp Manager] Erro na desconexão:', error);
      setState(prev => ({
        ...prev,
        message: 'Erro inesperado ao desconectar',
        isLoading: false
      }));

      toast({
        title: "Erro",
        description: 'Erro inesperado ao desconectar',
        variant: "destructive"
      });
    }
  }, [stopPolling, refreshProfile, toast]);

  // Obter mensagem padrão para cada estado
  const getStateMessage = (connectionState: ConnectionState): string => {
    switch (connectionState) {
      case 'needs_phone_number':
        return 'Configure seu número de telefone nas configurações';
      case 'needs_qr_code':
        return 'Clique em "Conectar WhatsApp" para gerar o QR Code';
      case 'is_connecting':
        return 'WhatsApp está conectando...';
      case 'already_connected':
        return 'WhatsApp conectado e funcionando';
      case 'error':
        return 'Erro na conexão';
      default:
        return 'Verificando estado da conexão...';
    }
  };

  // Atualizar estado baseado no perfil
  useEffect(() => {
    if (profile && !hasInitializedRef.current && !isInitializingRef.current) {
      const initialState = getInitialStateFromProfile();
      setState(prev => ({
        ...prev,
        connectionState: initialState.connectionState,
        message: initialState.message,
        instanceName: initialState.instanceName || null
      }));
    }
  }, [profile, getInitialStateFromProfile]);

  // Cleanup ao desmontar
  useEffect(() => {
    return () => {
      console.log('[WhatsApp Manager] Limpando recursos...');
      isMountedRef.current = false;
      clearTimers();
    };
  }, [clearTimers]);

  return {
    state,
    handleConnect,
    handleDisconnect,
    handleGenerateQR,
    getStateMessage
  };
};
