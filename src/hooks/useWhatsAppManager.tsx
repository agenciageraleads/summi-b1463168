
// ABOUTME: Hook refatorado para gerenciar conexão WhatsApp com máquina de estados explícita
// ABOUTME: Elimina race conditions e implementa fluxo de estado previsível e robusto

import { useState, useEffect, useRef, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useProfile } from '@/hooks/useProfile';
import {
  initializeWhatsAppConnection,
  generateConnectionCodes,
  checkConnectionStatus,
  disconnectWhatsApp,
  restartInstance,
  ConnectionResult,
  ConnectionMethod,
} from '@/services/whatsappConnection';

export type ConnectionState = 'needs_phone_number' | 'needs_connection' | 'is_connecting' | 'already_connected' | 'error';

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

// Tipos para a máquina de estados
type ConnectionCheckResult = 'connected' | 'connecting' | 'disconnected';

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

  // Refs para controle de lifecycle simplificadas
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const qrTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  // Limpar todos os timers
  const stopPolling = useCallback(() => {
    console.log('[WA Manager] Parando polling');
    if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
    if (qrTimeoutRef.current) clearTimeout(qrTimeoutRef.current);
    pollingIntervalRef.current = null;
    qrTimeoutRef.current = null;
    if (isMountedRef.current) {
      setState(prev => ({ ...prev, isPolling: false }));
    }
  }, []);

  // Máquina de estados corrigida - retorna estados macro claros
  const checkConnectionAndUpdate = useCallback(async (instanceName: string): Promise<ConnectionCheckResult> => {
    try {
      console.log('[WA Manager] Verificando conexão para:', instanceName);
      const statusResult = await checkConnectionStatus(instanceName);
      
      const rawState = statusResult.state || statusResult.status;
      console.log('[WA Manager] Estado bruto da API:', { rawState, success: statusResult.success });

      // Lógica da máquina de estados corrigida
      const finalConnectedStates = ['open', 'connected'];
      const transitionalConnectingStates = ['qr', 'connecting', 'pairing'];

      if (statusResult.success && finalConnectedStates.includes(rawState?.toLowerCase() || '')) {
        console.log('[WA Manager] Estado: CONECTADO');
        return 'connected';
      }
      
      if (statusResult.success && transitionalConnectingStates.includes(rawState?.toLowerCase() || '')) {
        console.log('[WA Manager] Estado: CONECTANDO');
        return 'connecting';
      }
      
      console.log('[WA Manager] Estado: DESCONECTADO');
      return 'disconnected';
    } catch (error) {
      console.error('[WA Manager] Erro ao checar status:', error);
      return 'disconnected';
    }
  }, []);

  // Define como conectado definitivamente
  const setConnectedStateDefinitively = useCallback(() => {
    console.log('[WA Manager] Definindo como conectado definitivamente');
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

  // Inicia o polling com lógica de máquina de estados explícita
  const startPolling = useCallback((instanceName: string) => {
    console.log('[WA Manager] Iniciando polling para:', instanceName);
    
    if (!isMountedRef.current) return;
    
    stopPolling();
    setState(prev => ({ ...prev, isPolling: true }));

    const checkAndUpdate = async () => {
      if (!isMountedRef.current) {
        stopPolling();
        return;
      }

      const connectionResult = await checkConnectionAndUpdate(instanceName);
      
      // Switch explícito para tratar cada estado da máquina
      switch (connectionResult) {
        case 'connected':
          toast({ 
            title: "✅ Conectado!", 
            description: "Seu WhatsApp foi conectado com sucesso.", 
            duration: 3000 
          });
          await refreshProfile();
          setConnectedStateDefinitively();
          break;
        
        case 'connecting':
          console.log('[WA Manager] Ainda conectando, continuando polling...');
          break;
        
        case 'disconnected':
          console.log('[WA Manager] Desconectado, continuando polling...');
          break;
      }
    };

    // Checagem inicial após 3 segundos
    setTimeout(checkAndUpdate, 3000);
    // Polling regular a cada 7 segundos
    pollingIntervalRef.current = setInterval(checkAndUpdate, 7000);

    // Timeout para expiração - 60 segundos
    qrTimeoutRef.current = setTimeout(async () => {
      if (!isMountedRef.current) return;
      console.log('[WA Manager] Códigos expirados, reiniciando...');
      stopPolling();
      setState(prev => ({ 
        ...prev, 
        message: 'Códigos expirados, reiniciando...', 
        qrCode: null,
        pairingCode: null 
      }));
      await restartInstance(instanceName);
      setTimeout(() => {
        handleConnect();
      }, 3000);
    }, 60000);

  }, [stopPolling, checkConnectionAndUpdate, refreshProfile, toast, setConnectedStateDefinitively]);

  // Gera ambos os códigos (QR Code e Pairing Code)
  const handleGenerateCodes = useCallback(async (instanceName: string) => {
    console.log(`[WA Manager] Gerando códigos para:`, instanceName);
    setState(prev => ({ 
      ...prev, 
      isLoading: true, 
      message: `Gerando códigos de conexão...` 
    }));
    
    try {
      const result: ConnectionResult = await generateConnectionCodes(instanceName);

      console.log('[WA Manager] Resultado dos códigos:', { 
        success: result.success, 
        hasQR: !!result.qrCode, 
        hasPairing: !!result.pairingCode, 
        state: result.state
      });

      if (result.state === 'already_connected') {
        console.log('[WA Manager] Já conectado detectado');
        setConnectedStateDefinitively();
        return;
      }

      if (result.success && (result.qrCode || result.pairingCode)) {
        console.log('[WA Manager] Códigos recebidos, exibindo na tela');
        setState(prev => ({
          ...prev,
          connectionState: 'needs_connection',
          qrCode: result.qrCode || null,
          pairingCode: result.pairingCode || null,
          message: 'Escolha um método para conectar seu WhatsApp',
          isLoading: false
        }));
        startPolling(instanceName);
      } else {
        throw new Error(result.error || 'Falha ao gerar códigos.');
      }
    } catch (error: any) {
      console.error('[WA Manager] Erro ao gerar códigos:', error);
      setState(prev => ({ 
        ...prev, 
        connectionState: 'error', 
        message: error.message, 
        isLoading: false 
      }));
    }
  }, [setConnectedStateDefinitively, startPolling]);

  // Manter compatibilidade - não usa mais o método, ambos são gerados juntos
  const switchConnectionMethod = useCallback((method: ConnectionMethod) => {
    console.log('[WA Manager] Método de conexão alterado para:', method);
    setState(prev => ({ 
      ...prev, 
      connectionMethod: method
    }));
  }, []);

  // Função de conexão simplificada com responsabilidade única
  const handleConnect = useCallback(async (method: ConnectionMethod = state.connectionMethod) => {
    console.log('[WA Manager] Iniciando processo de conexão');

    if (state.isLoading) return;
    
    if (!profile?.numero) {
      toast({ 
        title: 'Informações incompletas', 
        description: 'Configure seu número de telefone no perfil.', 
        variant: 'destructive' 
      });
      return;
    }

    // Limpar estado anterior
    stopPolling();
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
      
      // Passo 2: Gerar códigos e iniciar polling
      await handleGenerateCodes(instanceName);

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
  }, [profile, state.isLoading, state.connectionMethod, toast, stopPolling, refreshProfile, handleGenerateCodes]);

  // Função de desconexão simplificada com refresh garantido
  const handleDisconnect = useCallback(async () => {
    console.log('[WA Manager] Iniciando desconexão...');
    if (!profile?.instance_name) return;
    
    setState(prev => ({ ...prev, isLoading: true, message: 'Desconectando...' }));
    stopPolling();
    
    try {
      await disconnectWhatsApp(profile.instance_name);
      
      // Refresh garantido antes de resetar estado local
      await refreshProfile();
      
      // Resetar estado local somente após refresh
      setState(prev => ({
        ...prev,
        connectionState: profile?.numero ? 'needs_connection' : 'needs_phone_number',
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
  }, [profile, stopPolling, toast, refreshProfile]);

  // useEffect de inicialização unificado para evitar race conditions
  useEffect(() => {
    const initializeState = async () => {
      if (!profile) return;
      
      // Se já está conectado, não fazer nada
      if (state.connectionState === 'already_connected') return;
      
      console.log('[WA Manager] Inicializando estado baseado no perfil');
      
      // Verificar se tem número de telefone
      if (!profile.numero) {
        setState(prev => ({ 
          ...prev, 
          connectionState: 'needs_phone_number', 
          message: 'Configure seu número de telefone' 
        }));
        return;
      }
      
      // Se tem instância, verificar conexão
      if (profile.instance_name) {
        console.log('[WA Manager] Verificando status da instância existente:', profile.instance_name);
        const connectionResult = await checkConnectionAndUpdate(profile.instance_name);
        
        switch (connectionResult) {
          case 'connected':
            setConnectedStateDefinitively();
            break;
          case 'connecting':
            setState(prev => ({ 
              ...prev, 
              connectionState: 'is_connecting',
              message: 'Reconectando...' 
            }));
            // Iniciar conexão para obter códigos
            setTimeout(() => handleConnect(), 1000);
            break;
          case 'disconnected':
            setState(prev => ({ 
              ...prev, 
              connectionState: 'needs_connection', 
              message: 'Pronto para conectar',
              instanceName: profile.instance_name 
            }));
            break;
        }
      } else {
        setState(prev => ({ 
          ...prev, 
          connectionState: 'needs_connection', 
          message: 'Pronto para criar sua instância' 
        }));
      }
    };

    initializeState();
  }, [profile, checkConnectionAndUpdate, setConnectedStateDefinitively, handleConnect]);

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
