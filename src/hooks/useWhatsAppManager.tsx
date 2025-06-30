
// ABOUTME: Hook principal para gerenciar a conexão WhatsApp com máquina de estados corrigida
// ABOUTME: Implementa lógica unificada de inicialização e fluxo de estados previsível

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

  // CORREÇÃO: Máquina de estados explícita para conexão
  const checkConnectionAndUpdate = useCallback(async (instanceName: string): Promise<'connected' | 'connecting' | 'disconnected'> => {
    try {
      console.log('[WA Manager] Verificando status para:', instanceName);
      const statusResult = await checkConnectionStatus(instanceName);
      
      // CORREÇÃO: statusResult é um objeto StatusResult, não uma string
      const rawState = (statusResult.state || statusResult.status || '').toLowerCase();
      console.log('[WA Manager] Estado bruto da API:', rawState);

      // Estados finais de conexão estabelecida
      const finalConnectedStates = ['open', 'connected'];
      // Estados transicionais de conexão em progresso
      const transitionalConnectingStates = ['qr', 'connecting', 'pairing'];

      if (finalConnectedStates.includes(rawState)) {
        console.log('[WA Manager] Status: CONECTADO');
        return 'connected';
      }
      
      if (transitionalConnectingStates.includes(rawState)) {
        console.log('[WA Manager] Status: CONECTANDO');
        return 'connecting';
      }
      
      console.log('[WA Manager] Status: DESCONECTADO');
      return 'disconnected';
    } catch (error) {
      console.error('[WA Manager] Erro ao verificar status:', error);
      return 'disconnected';
    }
  }, []);

  // Limpar todos os recursos
  const cleanupResources = useCallback(() => {
    console.log('[WA Manager] Limpando recursos');
    if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
    if (qrTimeoutRef.current) clearTimeout(qrTimeoutRef.current);
    pollingIntervalRef.current = null;
    qrTimeoutRef.current = null;
    if (isMountedRef.current) {
      setState(prev => ({ ...prev, isPolling: false }));
    }
  }, []);

  // CORREÇÃO: Polling com lógica de estados explícita
  const startPolling = useCallback((instanceName: string) => {
    console.log('[WA Manager] Iniciando polling para:', instanceName);
    
    if (!isMountedRef.current) return;
    
    cleanupResources();
    setState(prev => ({ ...prev, isPolling: true }));

    const checkStatus = async () => {
      if (!isMountedRef.current) return;
      
      const connectionStatus = await checkConnectionAndUpdate(instanceName);
      
      switch (connectionStatus) {
        case 'connected':
          console.log('[WA Manager] Conexão confirmada - parando polling');
          cleanupResources();
          setState(prev => ({
            ...prev,
            connectionState: 'already_connected',
            qrCode: null,
            pairingCode: null,
            message: 'WhatsApp conectado e funcionando!',
            isLoading: false,
            isPolling: false,
          }));
          toast({ 
            title: "✅ Conectado!", 
            description: "Seu WhatsApp foi conectado com sucesso.", 
            duration: 3000 
          });
          await refreshProfile();
          break;
          
        case 'connecting':
          console.log('[WA Manager] Ainda conectando - continuando polling');
          // Continua o polling sem mudanças de estado
          break;
          
        case 'disconnected':
          console.log('[WA Manager] Desconectado durante polling');
          // Mantém o estado atual para exibir códigos
          break;
      }
    };

    // Primeira verificação após 3 segundos
    setTimeout(checkStatus, 3000);
    
    // Polling regular a cada 7 segundos
    pollingIntervalRef.current = setInterval(checkStatus, 7000);

    // Timeout para expiração dos códigos - 60 segundos
    qrTimeoutRef.current = setTimeout(async () => {
      if (!isMountedRef.current) return;
      console.log('[WA Manager] Códigos expirados, reiniciando...');
      cleanupResources();
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

  }, [checkConnectionAndUpdate, cleanupResources, refreshProfile, toast]);

  // Gerar códigos de conexão
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
        setState(prev => ({
          ...prev,
          connectionState: 'already_connected',
          qrCode: null,
          pairingCode: null,
          message: 'WhatsApp conectado e funcionando!',
          isLoading: false
        }));
        return;
      }

      if (result.success && (result.qrCode || result.pairingCode)) {
        console.log('[WA Manager] Códigos recebidos, iniciando polling');
        setState(prev => ({
          ...prev,
          connectionState: 'is_connecting',
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
  }, [startPolling]);

  // CORREÇÃO: Função handleConnect simplificada
  const handleConnect = useCallback(async (method: ConnectionMethod = state.connectionMethod) => {
    console.log('[WA Manager] Iniciando processo de conexão');

    if (state.isLoading) {
      console.log('[WA Manager] Já está carregando, ignorando');
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

    cleanupResources();
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

      // Criar instância se necessário
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
      
      // Gerar códigos de conexão
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
  }, [profile, state.isLoading, state.connectionMethod, toast, cleanupResources, refreshProfile, handleGenerateCodes]);

  // CORREÇÃO: Desconectar com refresh de perfil
  const handleDisconnect = useCallback(async () => {
    console.log('[WA Manager] Iniciando desconexão...');
    if (!profile?.instance_name) return;
    
    setState(prev => ({ ...prev, isLoading: true, message: 'Desconectando...' }));
    cleanupResources();
    
    try {
      await disconnectWhatsApp(profile.instance_name);
      
      // CORREÇÃO: Refresh do perfil antes de atualizar estado local
      await refreshProfile();
      
      setState(prev => ({
        ...prev,
        connectionState: 'needs_connection',
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
  }, [profile, cleanupResources, refreshProfile, toast]);

  // Alternar método de conexão
  const switchConnectionMethod = useCallback((method: ConnectionMethod) => {
    console.log('[WA Manager] Método de conexão alterado para:', method);
    setState(prev => ({ 
      ...prev, 
      connectionMethod: method
    }));
  }, []);

  // CORREÇÃO: useEffect de inicialização unificado para evitar race conditions
  useEffect(() => {
    const initializeConnectionState = async () => {
      if (!profile) {
        console.log('[WA Manager] Profile ainda não carregado');
        return;
      }
      
      // Se já está conectado, não fazer nada
      if (state.connectionState === 'already_connected') {
        console.log('[WA Manager] Já conectado, não fazendo verificação');
        return;
      }

      console.log('[WA Manager] Inicializando estado baseado no perfil');
      
      if (!profile.numero) {
        console.log('[WA Manager] Número não configurado');
        setState(prev => ({ 
          ...prev, 
          connectionState: 'needs_phone_number', 
          message: 'Configure seu número de telefone' 
        }));
        return;
      }

      if (!profile.instance_name) {
        console.log('[WA Manager] Instância não existe');
        setState(prev => ({ 
          ...prev, 
          connectionState: 'needs_connection', 
          message: 'Pronto para criar sua instância' 
        }));
        return;
      }

      // Verificar status da instância existente
      console.log('[WA Manager] Verificando status da instância existente:', profile.instance_name);
      const connectionStatus = await checkConnectionAndUpdate(profile.instance_name);
      
      switch (connectionStatus) {
        case 'connected':
          console.log('[WA Manager] Instância já conectada');
          setState(prev => ({
            ...prev,
            connectionState: 'already_connected',
            message: 'WhatsApp conectado e funcionando!',
            instanceName: profile.instance_name
          }));
          break;
          
        case 'connecting':
          console.log('[WA Manager] Instância em processo de conexão');
          setState(prev => ({
            ...prev,
            connectionState: 'is_connecting',
            message: 'Conectando...',
            instanceName: profile.instance_name
          }));
          startPolling(profile.instance_name);
          break;
          
        case 'disconnected':
          console.log('[WA Manager] Instância desconectada, pronta para conectar');
          setState(prev => ({
            ...prev,
            connectionState: 'needs_connection',
            message: 'Pronto para conectar',
            instanceName: profile.instance_name
          }));
          break;
      }
    };

    initializeConnectionState();
  }, [profile, checkConnectionAndUpdate, startPolling]);

  // Cleanup ao desmontar
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      console.log('[WA Manager] Desmontando, limpando recursos...');
      isMountedRef.current = false;
      cleanupResources();
    };
  }, [cleanupResources]);

  return {
    state,
    handleConnect,
    handleDisconnect,
    switchConnectionMethod,
  };
};
