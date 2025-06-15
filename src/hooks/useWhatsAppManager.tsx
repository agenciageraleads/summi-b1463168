// Refatorado: Hook principal para gerenciar a conexão WhatsApp Business
import { useState, useEffect, useRef, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useProfile } from '@/hooks/useProfile';
import {
  initializeWhatsAppConnection,
  generateQRCode,
  checkConnectionStatus,
  disconnectWhatsApp,
  restartInstance,
} from '@/services/whatsappConnection';

// Tipos
export type ConnectionState = 'needs_phone_number' | 'needs_qr_code' | 'is_connecting' | 'already_connected' | 'error';
export interface WhatsAppManagerState {
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

  // Estado principal do hook
  const [state, setState] = useState<WhatsAppManagerState>({
    connectionState: 'needs_phone_number',
    isLoading: false,
    qrCode: null,
    instanceName: null,
    message: 'Verificando estado da conexão...',
    isPolling: false
  });

  // Refs para controle
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const qrTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);
  const isCheckingConnectionRef = useRef(false);
  const isPollingActiveRef = useRef(false);
  const didAutoConnectRef = useRef(false);
  const isDefinitivelyConnectedRef = useRef(false);

  // Função para determinar estado inicial baseado no perfil
  const getInitialStateFromProfile = useCallback(() => {
    if (!profile) {
      return { connectionState: 'needs_phone_number' as ConnectionState, message: 'Carregando perfil...' };
    }
    if (!profile.numero) {
      return { connectionState: 'needs_phone_number' as ConnectionState, message: 'Configure seu número de telefone' };
    }
    if (profile.instance_name) {
      return { connectionState: 'needs_qr_code' as ConnectionState, message: 'Pronto para conectar', instanceName: profile.instance_name };
    }
    return { connectionState: 'needs_qr_code' as ConnectionState, message: 'Pronto para criar sua instância' };
  }, [profile]);

  // Limpar todos os timers
  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
    if (qrTimeoutRef.current) clearTimeout(qrTimeoutRef.current);
    pollingIntervalRef.current = null;
    qrTimeoutRef.current = null;
    isPollingActiveRef.current = false;
    if (isMountedRef.current) {
      setState(prev => ({ ...prev, isPolling: false }));
    }
  }, []);
  
  // Define o estado como conectado de forma definitiva
  const setConnectedStateDefinitively = useCallback(() => {
    isDefinitivelyConnectedRef.current = true;
    stopPolling();
    if (isMountedRef.current) {
      setState(prev => ({
        ...prev,
        connectionState: 'already_connected',
        qrCode: null,
        message: 'WhatsApp conectado e funcionando!',
        isLoading: false,
        isPolling: false,
      }));
    }
  }, [stopPolling]);

  // Checa o status da conexão
  const checkConnectionAndUpdate = useCallback(async (instanceName: string) => {
    if (!isMountedRef.current || isCheckingConnectionRef.current) return false;
    isCheckingConnectionRef.current = true;

    try {
      const statusResult = await checkConnectionStatus(instanceName);
      const isConnected = statusResult.success && ['open', 'connected'].includes(statusResult.state);
      
      console.log('[WA Manager] Estado detectado:', { state: statusResult.state, isConnected });

      if (isConnected) {
        if (!isDefinitivelyConnectedRef.current) {
          toast({ title: "✅ Conectado!", description: "Seu WhatsApp foi conectado com sucesso.", duration: 3000 });
          await refreshProfile();
        }
        setConnectedStateDefinitively();
        return true;
      }
      return false;
    } catch (error) {
      console.error("Erro ao checar status:", error);
      return false;
    } finally {
      isCheckingConnectionRef.current = false;
    }
  }, [refreshProfile, toast, setConnectedStateDefinitively]);

  // Gera QR Code e inicia o polling
  const handleGenerateQR = useCallback(async (instanceName: string) => {
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
      } else if (result.alreadyConnected || result.state === 'already_connected') {
        setConnectedStateDefinitively();
      } else {
        throw new Error(result.error || 'Falha ao gerar QR Code.');
      }
    } catch (error: any) {
      setState(prev => ({ ...prev, connectionState: 'error', message: error.message, isLoading: false }));
    }
  }, [setConnectedStateDefinitively, startPolling]);

  // Inicia o polling para verificar a conexão
  const startPolling = useCallback((instanceName: string) => {
    if (!isMountedRef.current || isPollingActiveRef.current || isDefinitivelyConnectedRef.current) return;
    
    stopPolling();
    isPollingActiveRef.current = true;
    setState(prev => ({ ...prev, isPolling: true }));

    const checkAndUpdate = async () => {
      if (!isMountedRef.current || !isPollingActiveRef.current || isDefinitivelyConnectedRef.current) {
        stopPolling();
        return;
      }
      const isConnected = await checkConnectionAndUpdate(instanceName);
      if (isConnected) stopPolling();
    };

    setTimeout(checkAndUpdate, 3000); // Checagem inicial
    pollingIntervalRef.current = setInterval(checkAndUpdate, 7000); // Polling regular

    // Timeout para expiração do QR Code
    qrTimeoutRef.current = setTimeout(async () => {
      if (!isMountedRef.current || isDefinitivelyConnectedRef.current) return;
      stopPolling();
      setState(prev => ({ ...prev, message: 'QR Code expirado, reiniciando...', qrCode: null }));
      await restartInstance(instanceName);
      setTimeout(() => handleGenerateQR(instanceName), 3000);
    }, 65000);

  }, [stopPolling, checkConnectionAndUpdate, handleGenerateQR]);

  // Ação principal de conexão, agora simplificada
  const handleConnect = useCallback(async () => {
    console.log('[WhatsApp Manager] 🚀 Tentativa de conexão iniciada pelo usuário.');

    if (state.isLoading) return;
    if (!profile?.numero) {
      toast({ title: 'Informações incompletas', description: 'Configure seu número de telefone no perfil.', variant: 'destructive' });
      return;
    }

    stopPolling();
    isDefinitivelyConnectedRef.current = false;
    setState(prev => ({ ...prev, isLoading: true, connectionState: 'is_connecting', message: 'Iniciando conexão...', qrCode: null }));

    try {
      let instanceName = profile.instance_name;

      // Passo 1: Se não houver nome da instância, cria uma
      if (!instanceName) {
        setState(prev => ({ ...prev, message: 'Criando nova instância...' }));
        const initResult = await initializeWhatsAppConnection();
        if (initResult.success && initResult.instanceName) {
          instanceName = initResult.instanceName;
          await refreshProfile();
        } else {
          throw new Error(initResult.error || 'Falha ao criar a instância.');
        }
      }
      
      // Passo 2: Verifica o status da conexão
      setState(prev => ({ ...prev, message: 'Verificando status da conexão...' }));
      const isConnected = await checkConnectionAndUpdate(instanceName);
      if (isConnected) return; // Se já conectado, a função `setConnectedStateDefinitively` já fez tudo
      
      // Passo 3: Se não estiver conectado, gera o QR Code
      setState(prev => ({ ...prev, message: 'Gerando QR Code...' }));
      await handleGenerateQR(instanceName);

    } catch (err: any) {
      console.error('[WhatsApp Manager] Erro durante handleConnect:', err);
      setState(prev => ({ ...prev, connectionState: 'error', isLoading: false, message: err.message || 'Erro inesperado.' }));
      toast({ title: "Erro na Conexão", description: err.message || 'Ocorreu um erro.', variant: 'destructive' });
    }
  }, [profile, state.isLoading, toast, stopPolling, refreshProfile, checkConnectionAndUpdate, handleGenerateQR]);

  // Desconectar WhatsApp
  const handleDisconnect = useCallback(async () => {
    console.log('[WhatsApp Manager] Iniciando desconexão...');
    if (!profile?.instance_name) return;
    setState(prev => ({ ...prev, isLoading: true, message: 'Desconectando...' }));
    stopPolling();
    try {
      await disconnectWhatsApp();
      isDefinitivelyConnectedRef.current = false;
      setState(prev => ({
        ...getInitialStateFromProfile(),
        isLoading: false,
        qrCode: null,
        message: 'WhatsApp desconectado com sucesso.',
      }));
      toast({ title: "Desconectado", description: "Seu WhatsApp foi desconectado." });
    } catch (error: any) {
      setState(prev => ({ ...prev, isLoading: false, message: error.message || 'Erro ao desconectar' }));
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    }
  }, [profile, stopPolling, toast, getInitialStateFromProfile]);

  // Obter mensagem de status
  const getStateMessage = (cs: ConnectionState): string => {
    switch (cs) {
      case 'needs_phone_number':
        return 'Configure seu número de telefone nas configurações';
      case 'needs_qr_code':
        return 'Pronto para conectar';
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

  // Efeito para definir o estado inicial com base no perfil
  useEffect(() => {
    if (!profile || didAutoConnectRef.current) return;
    if (isDefinitivelyConnectedRef.current) return;
    setState(prev => ({ ...prev, ...getInitialStateFromProfile() }));
  }, [profile, getInitialStateFromProfile]);

  // Efeito para auto-conexão inicial
  useEffect(() => {
    if (profile?.numero && !didAutoConnectRef.current && !isDefinitivelyConnectedRef.current) {
      didAutoConnectRef.current = true;
      handleConnect();
    }
  }, [profile?.numero, handleConnect]);

  // Cleanup ao desmontar
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      stopPolling();
    };
  }, [stopPolling]);

  return {
    state,
    handleConnect,
    handleDisconnect,
  };
};
