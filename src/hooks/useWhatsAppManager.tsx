// ABOUTME: Hook principal para gerenciar a conexão WhatsApp com correções definitivas para status "connecting"
// ABOUTME: Implementa detecção inteligente de status connecting e renovação automática no countdown

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
  countdownSeconds: number;
  hasConnectionError: boolean;
  errorCount: number;
  generationAttempts: number;
  isRenewing: boolean;
  // NOVOS estados para lidar com connecting
  isRestarting: boolean;
  restartAttempts: number;
  connectingDetectedAt: number | null;
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
    isPolling: false,
    countdownSeconds: 60,
    hasConnectionError: false,
    errorCount: 0,
    generationAttempts: 0,
    isRenewing: false,
    // NOVOS estados
    isRestarting: false,
    restartAttempts: 0,
    connectingDetectedAt: null
  });

  // Refs para controle de lifecycle
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const codeRenewalIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const connectingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);
  const isInitializedRef = useRef(false);

  // CORREÇÃO: Interpretação correta dos estados da Evolution API
  const interpretEvolutionState = useCallback((rawState: string): 'connected' | 'connecting' | 'disconnected' => {
    const normalizedState = rawState.toLowerCase();
    console.log('[WA Manager] Interpretando estado Evolution:', normalizedState);

    if (normalizedState === 'open' || normalizedState === 'connected') {
      console.log('[WA Manager] Estado interpretado: CONECTADO');
      return 'connected';
    }
    
    if (normalizedState === 'close' || normalizedState === 'disconnected') {
      console.log('[WA Manager] Estado interpretado: DESCONECTADO');
      return 'disconnected';
    }
    
    console.log('[WA Manager] Estado interpretado: CONECTANDO');
    return 'connecting';
  }, []);

  // Verificar status da conexão com detecção de connecting persistente
  const checkConnectionAndUpdate = useCallback(async (instanceName: string): Promise<'connected' | 'connecting' | 'disconnected'> => {
    try {
      console.log('[WA Manager] Verificando status para:', instanceName);
      const statusResult = await checkConnectionStatus(instanceName);
      
      const rawState = statusResult.state || statusResult.status || '';
      console.log('[WA Manager] Estado bruto da API Evolution:', rawState);

      const interpretedState = interpretEvolutionState(rawState);
      
      // NOVA LÓGICA: Detectar connecting persistente
      if (interpretedState === 'connecting') {
        const now = Date.now();
        const connectingStartTime = state.connectingDetectedAt || now;
        const connectingDuration = now - connectingStartTime;
        
        console.log(`[WA Manager] Status connecting por ${connectingDuration}ms`);
        
        // Se conectando por mais de 15 segundos, marcar para restart
        if (connectingDuration > 15000 && !state.isRestarting) {
          console.log('[WA Manager] ⚠️ Status connecting persistente detectado - será reiniciado');
          setState(prev => ({ 
            ...prev, 
            connectingDetectedAt: connectingStartTime,
            message: 'Status connecting persistente detectado - reiniciando instância...'
          }));
          
          // Agendar restart após retornar o estado
          setTimeout(() => handleRestartInstance(instanceName), 1000);
        } else if (!state.connectingDetectedAt) {
          setState(prev => ({ ...prev, connectingDetectedAt: now }));
        }
      } else {
        // Resetar tracking de connecting se mudou de estado
        if (state.connectingDetectedAt) {
          setState(prev => ({ ...prev, connectingDetectedAt: null }));
        }
      }

      return interpretedState;
    } catch (error) {
      console.error('[WA Manager] Erro ao verificar status:', error);
      return 'disconnected';
    }
  }, [interpretEvolutionState, state.connectingDetectedAt, state.isRestarting]);

  // NOVA: Função para reiniciar instância quando detectar connecting persistente
  const handleRestartInstance = useCallback(async (instanceName: string) => {
    if (state.isRestarting || state.restartAttempts >= 2) {
      console.log('[WA Manager] Restart já em andamento ou limite de tentativas atingido');
      return;
    }

    console.log(`[WA Manager] 🔄 Reiniciando instância devido a connecting persistente (tentativa ${state.restartAttempts + 1}/2)`);
    
    setState(prev => ({ 
      ...prev, 
      isRestarting: true,
      restartAttempts: prev.restartAttempts + 1,
      message: `Reiniciando instância (tentativa ${prev.restartAttempts + 1}/2)...`
    }));

    try {
      const restartResult = await restartInstance(instanceName);
      
      if (restartResult.success) {
        console.log('[WA Manager] ✅ Instância reiniciada com sucesso');
        
        // Aguardar estabilização
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // Tentar gerar códigos novamente
        await handleGenerateCodes(instanceName);
        
        setState(prev => ({ 
          ...prev, 
          isRestarting: false,
          connectingDetectedAt: null,
          message: 'Instância reiniciada - gerando novos códigos...'
        }));
        
        toast({ 
          title: "🔄 Instância Reiniciada", 
          description: "Status connecting corrigido - gerando novos códigos.", 
          duration: 4000 
        });
        
      } else {
        throw new Error(restartResult.error || 'Falha no restart');
      }
      
    } catch (error: any) {
      console.error('[WA Manager] ❌ Erro ao reiniciar instância:', error);
      
      setState(prev => ({ 
        ...prev, 
        isRestarting: false,
        hasConnectionError: true,
        errorCount: prev.errorCount + 1,
        message: `Erro no restart (${prev.restartAttempts}/2): ${error.message}`
      }));
      
      // Se ainda há tentativas, tentar novamente após delay
      if (state.restartAttempts < 2) {
        setTimeout(() => handleRestartInstance(instanceName), 5000);
      } else {
        toast({ 
          title: "❌ Restart Falhou", 
          description: "Falha ao reiniciar instância. Tente recriar a instância.", 
          variant: "destructive",
          duration: 6000
        });
      }
    }
  }, [state.isRestarting, state.restartAttempts, toast]);

  // Limpar todos os recursos
  const cleanupResources = useCallback(() => {
    console.log('[WA Manager] Limpando recursos');
    if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
    if (codeRenewalIntervalRef.current) clearInterval(codeRenewalIntervalRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    if (connectingTimeoutRef.current) clearTimeout(connectingTimeoutRef.current);
    pollingIntervalRef.current = null;
    codeRenewalIntervalRef.current = null;
    countdownIntervalRef.current = null;
    connectingTimeoutRef.current = null;
  }, []);

  // CORREÇÃO: Validação rigorosa do pairing code - apenas 8 caracteres alfanuméricos
  const validatePairingCode = useCallback((rawPairingCode: string | null | undefined): string | null => {
    if (!rawPairingCode) {
      console.log('[WA Manager] 🔍 Pairing code vazio ou nulo');
      return null;
    }

    console.log('[WA Manager] 🔍 Validando pairing code bruto:', rawPairingCode);
    
    const cleanCode = rawPairingCode.toString().trim().toUpperCase();
    
    // CORREÇÃO: Validação rigorosa - exatos 8 caracteres alfanuméricos
    if (/^[A-Z0-9]{8}$/.test(cleanCode)) {
      console.log('[WA Manager] ✅ Pairing code válido:', cleanCode);
      return cleanCode;
    }
    
    console.log('[WA Manager] ❌ Pairing code inválido - formato:', cleanCode, 'comprimento:', cleanCode.length);
    return null;
  }, []);

  // CORREÇÃO: Renovar códigos com implementação automática no countdown
  const renewCodes = useCallback(async (instanceName: string, isAutomatic = false) => {
    if (!isMountedRef.current) return;
    
    console.log(`[WA Manager] ${isAutomatic ? 'Renovação automática' : 'Renovação manual'} de códigos para:`, instanceName);
    
    setState(prev => ({ ...prev, isRenewing: true }));
    
    try {
      const result: ConnectionResult = await generateConnectionCodes(instanceName);

      if (result.success && (result.qrCode || result.pairingCode)) {
        console.log('[WA Manager] Códigos renovados com sucesso');
        
        const validPairingCode = validatePairingCode(result.pairingCode);
        
        setState(prev => ({
          ...prev,
          qrCode: result.qrCode || null,
          pairingCode: validPairingCode,
          message: validPairingCode && result.qrCode 
            ? 'Códigos renovados - use qualquer um dos métodos'
            : validPairingCode 
            ? 'Código de pareamento renovado'
            : result.qrCode 
            ? 'QR Code renovado'
            : 'Códigos renovados',
          hasConnectionError: false,
          errorCount: 0,
          isRenewing: false,
          countdownSeconds: 60, // Reset countdown após renovação
          restartAttempts: 0, // Reset restart attempts após renovação bem-sucedida
          connectingDetectedAt: null
        }));
        
        if (isAutomatic) {
          toast({ 
            title: "🔄 Códigos renovados", 
            description: "Novos códigos de conexão foram gerados automaticamente.", 
            duration: 3000 
          });
        }
        
      } else {
        console.log('[WA Manager] Falha ao renovar códigos:', result.error);
        
        // Se falhar e mencionar connecting, pode precisar de restart
        if (result.error?.includes('connecting') || result.error?.includes('needsRestart')) {
          handleRestartInstance(instanceName);
        } else {
          setState(prev => ({
            ...prev,
            hasConnectionError: true,
            errorCount: prev.errorCount + 1,
            message: `Erro ao renovar códigos: ${result.error}`,
            isRenewing: false
          }));
        }
      }
    } catch (error: any) {
      console.error('[WA Manager] Erro ao renovar códigos:', error);
      setState(prev => ({
        ...prev,
        hasConnectionError: true,
        errorCount: prev.errorCount + 1,
        message: `Erro de conexão: ${error.message}`,
        isRenewing: false
      }));
    }
  }, [validatePairingCode, toast, handleRestartInstance]);

  // NOVA: Função para forçar restart manual
  const forceRestartInstance = useCallback(async () => {
    if (profile?.instance_name) {
      setState(prev => ({ ...prev, restartAttempts: 0 })); // Reset tentativas para permitir restart manual
      await handleRestartInstance(profile.instance_name);
    }
  }, [profile?.instance_name, handleRestartInstance]);

  // CORREÇÃO: Iniciar contador regressivo com renovação automática
  const startCountdown = useCallback((instanceName: string) => {
    console.log('[WA Manager] Iniciando countdown de 60 segundos com renovação automática');
    
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
    }
    
    setState(prev => ({ ...prev, countdownSeconds: 60 }));
    
    countdownIntervalRef.current = setInterval(() => {
      if (!isMountedRef.current) return;
      
      setState(prev => {
        const newSeconds = prev.countdownSeconds - 1;
        
        if (newSeconds <= 0) {
          console.log('[WA Manager] ⏰ Countdown zerou - iniciando renovação automática');
          // CORREÇÃO CRÍTICA: Renovação automática quando countdown chega a zero
          setTimeout(() => renewCodes(instanceName, true), 100);
          return { ...prev, countdownSeconds: 60 }; // Reset para próximo ciclo
        }
        
        return { ...prev, countdownSeconds: newSeconds };
      });
    }, 1000);
  }, [renewCodes]);

  // Polling inteligente com detecção de connecting
  const startPolling = useCallback((instanceName: string) => {
    console.log('[WA Manager] Iniciando polling inteligente para:', instanceName);
    
    if (!isMountedRef.current) return;
    
    if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
    if (codeRenewalIntervalRef.current) clearInterval(codeRenewalIntervalRef.current);
    
    setState(prev => ({ ...prev, isPolling: true }));

    const checkStatus = async () => {
      if (!isMountedRef.current) return;
      
      const connectionStatus = await checkConnectionAndUpdate(instanceName);
      
      if (connectionStatus === 'connected') {
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
          isRenewing: false,
          hasConnectionError: false,
          errorCount: 0,
          generationAttempts: 0,
          countdownSeconds: 60,
          isRestarting: false,
          restartAttempts: 0,
          connectingDetectedAt: null
        }));
        toast({ 
          title: "✅ Conectado!", 
          description: "Seu WhatsApp foi conectado com sucesso.", 
          duration: 3000 
        });
        await refreshProfile();
      }
      // connecting é tratado automaticamente em checkConnectionAndUpdate
    };

    // Primeira verificação após 3 segundos
    setTimeout(checkStatus, 3000);
    
    // Polling regular a cada 7 segundos
    pollingIntervalRef.current = setInterval(checkStatus, 7000);

  }, [checkConnectionAndUpdate, cleanupResources, refreshProfile, toast]);

  // CORREÇÃO: Gerar códigos de conexão com controle de tentativas
  const handleGenerateCodes = useCallback(async (instanceName: string) => {
    const maxAttempts = 3;
    
    console.log(`[WA Manager] Gerando códigos para: ${instanceName} (tentativa ${state.generationAttempts + 1}/${maxAttempts})`);
    
    setState(prev => ({ 
      ...prev, 
      isLoading: true, 
      message: `Gerando códigos de conexão (tentativa ${prev.generationAttempts + 1}/${maxAttempts})...`,
      hasConnectionError: false,
      generationAttempts: prev.generationAttempts + 1
    }));
    
    try {
      const result: ConnectionResult = await generateConnectionCodes(instanceName);

      console.log('[WA Manager] Resultado dos códigos:', { 
        success: result.success, 
        hasQR: !!result.qrCode, 
        hasPairing: !!result.pairingCode, 
        state: result.state,
        error: result.error
      });

      if (result.state === 'already_connected') {
        console.log('[WA Manager] Já conectado detectado');
        setState(prev => ({
          ...prev,
          connectionState: 'already_connected',
          qrCode: null,
          pairingCode: null,
          message: 'WhatsApp conectado e funcionando!',
          isLoading: false,
          hasConnectionError: false,
          errorCount: 0,
          generationAttempts: 0
        }));
        return;
      }

      // Verificar se precisa de restart devido a connecting
      if (result.error?.includes('connecting') || (result as any).needsRestart) {
        console.log('[WA Manager] API sinalizou necessidade de restart');
        handleRestartInstance(instanceName);
        return;
      }

      if (result.success && (result.qrCode || result.pairingCode)) {
        console.log('[WA Manager] Códigos recebidos, validando pairing code...');
        
        const validPairingCode = validatePairingCode(result.pairingCode);
        
        setState(prev => ({
          ...prev,
          connectionState: 'is_connecting',
          qrCode: result.qrCode || null,
          pairingCode: validPairingCode,
          message: result.qrCode && validPairingCode 
            ? 'Use qualquer um dos métodos para conectar seu WhatsApp'
            : result.qrCode 
            ? 'Use o QR Code para conectar'
            : validPairingCode 
            ? 'Use o código de pareamento para conectar'
            : 'Códigos gerados - verificando disponibilidade...',
          isLoading: false,
          hasConnectionError: false,
          errorCount: 0,
          generationAttempts: 0
        }));
        
        startCountdown(instanceName);
        startPolling(instanceName);
      } else {
        throw new Error(result.error || 'Falha ao gerar códigos.');
      }
    } catch (error: any) {
      console.error('[WA Manager] Erro ao gerar códigos:', error);
      
      const shouldRetry = state.generationAttempts < maxAttempts;
      
      setState(prev => ({ 
        ...prev, 
        connectionState: shouldRetry ? 'needs_connection' : 'error', 
        message: shouldRetry 
          ? `Erro na tentativa ${prev.generationAttempts}. Tentando novamente...`
          : `Falha após ${maxAttempts} tentativas: ${error.message}`, 
        isLoading: false,
        hasConnectionError: true,
        errorCount: prev.errorCount + 1
      }));
      
      // Retry automático se ainda tem tentativas
      if (shouldRetry) {
        setTimeout(() => handleGenerateCodes(instanceName), 2000);
      }
    }
  }, [state.generationAttempts, validatePairingCode, startCountdown, startPolling, handleRestartInstance]);

  // Função handleConnect simplificada
  const handleConnect = useCallback(async (method: ConnectionMethod = state.connectionMethod) => {
    console.log('[WA Manager] Iniciando processo de conexão');

    if (state.isLoading) {
      console.log('[WA Manager] Já está carregando, ignorando');
      return;
    }
    
    if (!profile?.numero) {
      toast({ 
        title: '⚠️ Informações incompletas', 
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
      pairingCode: null,
      hasConnectionError: false,
      generationAttempts: 0,
      isRenewing: false
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
        message: err.message || 'Erro inesperado.',
        hasConnectionError: true,
        errorCount: prev.errorCount + 1,
        generationAttempts: 0
      }));
      toast({ 
        title: "❌ Erro na Conexão", 
        description: err.message || 'Ocorreu um erro.', 
        variant: 'destructive' 
      });
    }
  }, [profile, state.isLoading, state.connectionMethod, toast, cleanupResources, refreshProfile, handleGenerateCodes]);

  // Desconectar com refresh de perfil
  const handleDisconnect = useCallback(async () => {
    console.log('[WA Manager] Iniciando desconexão...');
    if (!profile?.instance_name) return;
    
    setState(prev => ({ ...prev, isLoading: true, message: 'Desconectando...' }));
    cleanupResources();
    
    try {
      await disconnectWhatsApp(profile.instance_name);
      
      await refreshProfile();
      
      setState(prev => ({
        ...prev,
        connectionState: 'needs_connection',
        isLoading: false,
        isPolling: false,
        isRenewing: false,
        qrCode: null,
        pairingCode: null,
        message: 'WhatsApp desconectado com sucesso.',
        hasConnectionError: false,
        errorCount: 0,
        generationAttempts: 0,
        countdownSeconds: 60,
        isRestarting: false,
        restartAttempts: 0,
        connectingDetectedAt: null
      }));
      
      toast({ title: "✅ Desconectado", description: "Seu WhatsApp foi desconectado." });
    } catch (error: any) {
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        message: error.message || 'Erro ao desconectar',
        hasConnectionError: true,
        errorCount: prev.errorCount + 1
      }));
      toast({ 
        title: "❌ Erro", 
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

  // Função para forçar renovação manual dos códigos
  const forceRenewCodes = useCallback(async () => {
    if (profile?.instance_name && state.connectionState === 'is_connecting') {
      await renewCodes(profile.instance_name, false);
    }
  }, [profile?.instance_name, state.connectionState, renewCodes]);

  // NOVA: Função para forçar restart manual
  const forceRestartInstance = useCallback(async () => {
    if (profile?.instance_name) {
      setState(prev => ({ ...prev, restartAttempts: 0 })); // Reset tentativas para permitir restart manual
      await handleRestartInstance(profile.instance_name);
    }
  }, [profile?.instance_name, handleRestartInstance]);

  // useEffect de inicialização controlado para evitar loops
  useEffect(() => {
    if (isInitializedRef.current || !profile) {
      return;
    }

    const initializeConnectionState = async () => {
      console.log('[WA Manager] Inicializando estado baseado no perfil - ÚNICA VEZ');
      
      if (!profile.numero) {
        console.log('[WA Manager] Número não configurado');
        setState(prev => ({ 
          ...prev, 
          connectionState: 'needs_phone_number', 
          message: 'Configure seu número de telefone' 
        }));
        isInitializedRef.current = true;
        return;
      }

      if (!profile.instance_name) {
        console.log('[WA Manager] Instância não existe');
        setState(prev => ({ 
          ...prev, 
          connectionState: 'needs_connection', 
          message: 'Pronto para criar sua instância' 
        }));
        isInitializedRef.current = true;
        return;
      }

      console.log('[WA Manager] Verificando status da instância existente:', profile.instance_name);
      const connectionStatus = await checkConnectionAndUpdate(profile.instance_name);
      
      switch (connectionStatus) {
        case 'connected':
          console.log('[WA Manager] Instância já conectada');
          setState(prev => ({
            ...prev,
            connectionState: 'already_connected',
            message: 'WhatsApp conectado e funcionando!',
            instanceName: profile.instance_name,
            hasConnectionError: false,
            errorCount: 0,
            generationAttempts: 0
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
      
      isInitializedRef.current = true;
    };

    initializeConnectionState();
  }, [profile?.id, profile?.numero, profile?.instance_name, checkConnectionAndUpdate, startPolling]);

  // Cleanup ao desmontar
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      console.log('[WA Manager] Desmontando, limpando recursos...');
      isMountedRef.current = false;
      isInitializedRef.current = false;
      cleanupResources();
    };
  }, [cleanupResources]);

  return {
    state,
    handleConnect,
    handleDisconnect,
    switchConnectionMethod,
    forceRenewCodes,
    forceRestartInstance, // NOVA função exportada
  };
};
