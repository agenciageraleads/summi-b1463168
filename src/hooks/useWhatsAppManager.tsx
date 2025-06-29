
// ABOUTME: Hook principal para gerenciar a conexão WhatsApp com suporte a QR Code e Pairing Code
// ABOUTME: Controla todo o fluxo de conexão, polling e estados da aplicação

import { useState, useEffect, useRef, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useProfile } from '@/hooks/useProfile';
import {
  initializeWhatsAppConnection,
  generateQRCode,
  generatePairingCode,
  checkConnectionStatus,
  disconnectWhatsApp,
  restartInstance,
  ConnectionResult,
  ConnectionMethod,
} from '@/services/whatsappConnection';

export type ConnectionState = 'needs_phone_number' | 'needs_qr_code' | 'needs_pairing_code' | 'is_connecting' | 'already_connected' | 'error';

export interface WhatsAppManagerState {
  connectionState: ConnectionState;
  connectionMethod: ConnectionMethod;
  isLoading: boolean;
  qrCode: string | null;
  pairingCode: string | null;
  instanceName: string | null;
  message: string;
  isPolling: boolean;
}

export const useWhatsAppManager = () => {
  const { toast } = useToast();
  const { profile, refreshProfile } = useProfile();

  const [state, setState] = useState<WhatsAppManagerState>({
    connectionState: 'needs_phone_number',
    connectionMethod: 'qr-code',
    isLoading: false,
    qrCode: null,
    pairingCode: null,
    instanceName: null,
    message: 'Verificando estado da conexão...',
    isPolling: false
  });

  // Refs para controle de lifecycle
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const qrTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);
  const isCheckingConnectionRef = useRef(false);
  const isPollingActiveRef = useRef(false);
  const hasAutoConnectedRef = useRef(false);
  const isDefinitivelyConnectedRef = useRef(false);

  // Limpar todos os timers
  const stopPolling = useCallback(() => {
    console.log('[WA Manager] Parando polling');
    if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
    if (qrTimeoutRef.current) clearTimeout(qrTimeoutRef.current);
    pollingIntervalRef.current = null;
    qrTimeoutRef.current = null;
    isPollingActiveRef.current = false;
    if (isMountedRef.current) {
      setState(prev => ({ ...prev, isPolling: false }));
    }
  }, []);
  
  // Define o estado como conectado definitivamente
  const setConnectedStateDefinitively = useCallback(() => {
    console.log('[WA Manager] Definindo como conectado definitivamente');
    isDefinitivelyConnectedRef.current = true;
    stopPolling();
    if (isMountedRef.current) {
      setState(prev => ({
        ...prev,
        connectionState: 'already_connected',
        qrCode: null,
        pairingCode: null,
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
      console.log('[WA Manager] Verificando conexão para:', instanceName);
      const statusResult = await checkConnectionStatus(instanceName);
      
      const apiState = statusResult.state;
      const isConnected = statusResult.success && ['open', 'connected'].includes(apiState || '');
      
      console.log('[WA Manager] Estado detectado:', { 
        apiState,
        isConnected,
        success: statusResult.success
      });

      if (isConnected) {
        console.log('[WA Manager] Conexão confirmada');
        if (!isDefinitivelyConnectedRef.current) {
          toast({ 
            title: "✅ Conectado!", 
            description: "Seu WhatsApp foi conectado com sucesso.", 
            duration: 3000 
          });
          await refreshProfile();
        }
        setConnectedStateDefinitively();
        return true;
      }
      return false;
    } catch (error) {
      console.error('[WA Manager] Erro ao checar status:', error);
      return false;
    } finally {
      isCheckingConnectionRef.current = false;
    }
  }, [refreshProfile, toast, setConnectedStateDefinitively]);

  // Inicia o polling para verificar a conexão
  const startPolling = useCallback((instanceName: string) => {
    console.log('[WA Manager] Iniciando polling para:', instanceName);
    
    if (!isMountedRef.current || isPollingActiveRef.current || isDefinitivelyConnectedRef.current) {
      return;
    }
    
    stopPolling();
    isPollingActiveRef.current = true;
    setState(prev => ({ ...prev, isPolling: true }));

    const checkAndUpdate = async () => {
      if (!isMountedRef.current || !isPollingActiveRef.current || isDefinitivelyConnectedRef.current) {
        stopPolling();
        return;
      }
      const isConnected = await checkConnectionAndUpdate(instanceName);
      if (isConnected) {
        stopPolling();
      }
    };

    // Checagem inicial após 3 segundos
    setTimeout(checkAndUpdate, 3000);
    // Polling regular a cada 7 segundos
    pollingIntervalRef.current = setInterval(checkAndUpdate, 7000);

    // Timeout para expiração - 60 segundos
    qrTimeoutRef.current = setTimeout(async () => {
      if (!isMountedRef.current || isDefinitivelyConnectedRef.current) return;
      console.log('[WA Manager] Código expirado, reiniciando...');
      stopPolling();
      setState(prev => ({ 
        ...prev, 
        message: 'Código expirado, reiniciando...', 
        qrCode: null,
        pairingCode: null 
      }));
      await restartInstance(instanceName);
      setTimeout(() => {
        handleConnect(state.connectionMethod);
      }, 3000);
    }, 60000);

  }, [stopPolling, checkConnectionAndUpdate, state.connectionMethod]);

  // Gera código baseado no método selecionado
  const handleGenerateCode = useCallback(async (instanceName: string, method: ConnectionMethod) => {
    console.log(`[WA Manager] Gerando ${method} para:`, instanceName);
    setState(prev => ({ 
      ...prev, 
      isLoading: true, 
      message: `Gerando ${method === 'qr-code' ? 'QR Code' : 'Pairing Code'}...` 
    }));
    
    try {
      const result: ConnectionResult = method === 'qr-code' 
        ? await generateQRCode(instanceName)
        : await generatePairingCode(instanceName);

      console.log('[WA Manager] Resultado do código:', { 
        success: result.success, 
        hasCode: !!(result.qrCode || result.pairingCode), 
        state: result.state
      });

      if (result.state === 'already_connected') {
        console.log('[WA Manager] Já conectado detectado');
        setConnectedStateDefinitively();
        return;
      }

      if (result.success && (result.qrCode || result.pairingCode)) {
        console.log('[WA Manager] Código recebido, exibindo na tela');
        setState(prev => ({
          ...prev,
          connectionState: method === 'qr-code' ? 'needs_qr_code' : 'needs_pairing_code',
          qrCode: result.qrCode || null,
          pairingCode: result.pairingCode || null,
          message: `${method === 'qr-code' ? 'Escaneie o QR Code' : 'Digite o Pairing Code'} com seu WhatsApp`,
          isLoading: false
        }));
        startPolling(instanceName);
      } else {
        throw new Error(result.error || 'Falha ao gerar código.');
      }
    } catch (error: any) {
      console.error('[WA Manager] Erro ao gerar código:', error);
      setState(prev => ({ 
        ...prev, 
        connectionState: 'error', 
        message: error.message, 
        isLoading: false 
      }));
    }
  }, [setConnectedStateDefinitively, startPolling]);

  // Trocar método de conexão
  const switchConnectionMethod = useCallback((method: ConnectionMethod) => {
    console.log('[WA Manager] Trocando método de conexão para:', method);
    setState(prev => ({ 
      ...prev, 
      connectionMethod: method,
      qrCode: null,
      pairingCode: null 
    }));
  }, []);

  // Ação principal de conexão
  const handleConnect = useCallback(async (method: ConnectionMethod = state.connectionMethod) => {
    console.log('[WA Manager] Conectando com método:', method);

    if (state.isLoading) {
      return;
    }
    
    if (!profile?.numero) {
      toast({ 
        title: 'Informações incompletas', 
        description: 'Configure seu número de telefone no perfil.', 
        variant: 'destructive' 
      });
      return;
    }

    stopPolling();
    isDefinitivelyConnectedRef.current = false;
    setState(prev => ({ 
      ...prev, 
      isLoading: true, 
      connectionState: 'is_connecting', 
      connectionMethod: method,
      message: 'Iniciando conexão...', 
      qrCode: null,
      pairingCode: null 
    }));

    try {
      let instanceName = profile.instance_name;

      // Passo 1: Criar instância se necessário
      if (!instanceName) {
        console.log('[WA Manager] Criando nova instância...');
        setState(prev => ({ ...prev, message: 'Criando nova instância...' }));
        const initResult = await initializeWhatsAppConnection();
        if (initResult.success && initResult.instanceName) {
          instanceName = initResult.instanceName;
          await refreshProfile();
        } else {
          throw new Error(initResult.error || 'Falha ao criar a instância.');
        }
      }
      
      // Passo 2: Verificar status atual
      console.log('[WA Manager] Verificando status da instância:', instanceName);
      setState(prev => ({ ...prev, message: 'Verificando status da conexão...' }));
      const isConnected = await checkConnectionAndUpdate(instanceName);
      if (isConnected) {
        return;
      }
      
      // Passo 3: Gerar código baseado no método
      await handleGenerateCode(instanceName, method);

    } catch (err: any) {
      console.error('[WA Manager] Erro durante handleConnect:', err);
      setState(prev => ({ 
        ...prev, 
        connectionState: 'error', 
        isLoading: false, 
        message: err.message || 'Erro inesperado.' 
      }));
      toast({ 
        title: "Erro na Conexão", 
        description: err.message || 'Ocorreu um erro.', 
        variant: 'destructive' 
      });
    }
  }, [profile, state.isLoading, state.connectionMethod, toast, stopPolling, refreshProfile, checkConnectionAndUpdate, handleGenerateCode]);

  // Desconectar WhatsApp
  const handleDisconnect = useCallback(async () => {
    console.log('[WA Manager] Iniciando desconexão...');
    if (!profile?.instance_name) return;
    
    setState(prev => ({ ...prev, isLoading: true, message: 'Desconectando...' }));
    stopPolling();
    
    try {
      await disconnectWhatsApp(profile.instance_name);
      isDefinitivelyConnectedRef.current = false;
      hasAutoConnectedRef.current = false;
      
      setState(prev => ({
        ...prev,
        connectionState: 'needs_qr_code',
        isLoading: false,
        isPolling: false,
        qrCode: null,
        pairingCode: null,
        message: 'WhatsApp desconectado com sucesso.',
      }));
      
      toast({ title: "Desconectado", description: "Seu WhatsApp foi desconectado." });
    } catch (error: any) {
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        message: error.message || 'Erro ao desconectar' 
      }));
      toast({ 
        title: "Erro", 
        description: error.message, 
        variant: "destructive" 
      });
    }
  }, [profile, stopPolling, toast]);

  // Estado inicial baseado no perfil
  useEffect(() => {
    if (!profile) return;
    
    if (isDefinitivelyConnectedRef.current) {
      return;
    }
    
    if (!profile.numero) {
      setState(prev => ({ 
        ...prev, 
        connectionState: 'needs_phone_number', 
        message: 'Configure seu número de telefone' 
      }));
    } else if (profile.instance_name) {
      setState(prev => ({ 
        ...prev, 
        connectionState: 'needs_qr_code', 
        message: 'Pronto para conectar', 
        instanceName: profile.instance_name 
      }));
    } else {
      setState(prev => ({ 
        ...prev, 
        connectionState: 'needs_qr_code', 
        message: 'Pronto para criar sua instância' 
      }));
    }
  }, [profile]);

  // Auto-conexão inicial
  useEffect(() => {
    if (profile?.numero && profile?.instance_name && !hasAutoConnectedRef.current && !isDefinitivelyConnectedRef.current) {
      console.log('[WA Manager] Executando auto-conexão inicial...');
      hasAutoConnectedRef.current = true;
      
      setTimeout(() => {
        if (isMountedRef.current) {
          handleConnect();
        }
      }, 1000);
    }
  }, [profile?.numero, profile?.instance_name, handleConnect]);

  // Cleanup ao desmontar
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      console.log('[WA Manager] Limpando recursos...');
      isMountedRef.current = false;
      stopPolling();
    };
  }, [stopPolling]);

  return {
    state,
    handleConnect,
    handleDisconnect,
    switchConnectionMethod,
  };
};
