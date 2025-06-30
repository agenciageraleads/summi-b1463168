// ABOUTME: Hook principal para gerenciar a conexão WhatsApp com máquina de estados corrigida
// ABOUTME: Implementa lógica unificada de inicialização e fluxo de estados previsível com correção do pairing code

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
    errorCount: 0
  });

  // Refs para controle de lifecycle
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const codeRenewalIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);
  const isInitializedRef = useRef(false);

  // CORREÇÃO: Interpretação correta dos estados da Evolution API
  const interpretEvolutionState = useCallback((rawState: string): 'connected' | 'connecting' | 'disconnected' => {
    const normalizedState = rawState.toLowerCase();
    console.log('[WA Manager] Interpretando estado Evolution:', normalizedState);

    // CORREÇÃO: Aceitar tanto "open" quanto "connected" como conectado
    if (normalizedState === 'open' || normalizedState === 'connected') {
      console.log('[WA Manager] Estado interpretado: CONECTADO');
      return 'connected';
    }
    
    // "close" ou "disconnected" significa desconectado
    if (normalizedState === 'close' || normalizedState === 'disconnected') {
      console.log('[WA Manager] Estado interpretado: DESCONECTADO');
      return 'disconnected';
    }
    
    // TODO O RESTO (connecting, qr, pairing, etc.) significa conectando
    console.log('[WA Manager] Estado interpretado: CONECTANDO');
    return 'connecting';
  }, []);

  // Verificar status da conexão com interpretação corrigida
  const checkConnectionAndUpdate = useCallback(async (instanceName: string): Promise<'connected' | 'connecting' | 'disconnected'> => {
    try {
      console.log('[WA Manager] Verificando status para:', instanceName);
      const statusResult = await checkConnectionStatus(instanceName);
      
      const rawState = statusResult.state || statusResult.status || '';
      console.log('[WA Manager] Estado bruto da API Evolution:', rawState);

      return interpretEvolutionState(rawState);
    } catch (error) {
      console.error('[WA Manager] Erro ao verificar status:', error);
      return 'disconnected';
    }
  }, [interpretEvolutionState]);

  // Limpar todos os recursos
  const cleanupResources = useCallback(() => {
    console.log('[WA Manager] Limpando recursos');
    if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
    if (codeRenewalIntervalRef.current) clearInterval(codeRenewalIntervalRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    pollingIntervalRef.current = null;
    codeRenewalIntervalRef.current = null;
    countdownIntervalRef.current = null;
  }, []);

  // Iniciar contador regressivo
  const startCountdown = useCallback(() => {
    console.log('[WA Manager] Iniciando countdown de 60 segundos');
    
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
    }
    
    setState(prev => ({ ...prev, countdownSeconds: 60 }));
    
    countdownIntervalRef.current = setInterval(() => {
      if (!isMountedRef.current) return;
      
      setState(prev => {
        const newSeconds = prev.countdownSeconds - 1;
        
        if (newSeconds <= 0) {
          console.log('[WA Manager] Countdown finalizado, renovando códigos...');
          return { ...prev, countdownSeconds: 60 }; // Reset para próximo ciclo
        }
        
        return { ...prev, countdownSeconds: newSeconds };
      });
    }, 1000);
  }, []);

  // CORREÇÃO: Validação flexível do pairing code
  const validateAndCleanPairingCode = useCallback((rawPairingCode: string | null | undefined): string | null => {
    if (!rawPairingCode) {
      console.log('[WA Manager] 🚨 Pairing code vazio ou nulo');
      return null;
    }

    console.log('[WA Manager] 🚨 Pairing code bruto recebido:', rawPairingCode);
    
    // CORREÇÃO: Validação mais flexível - aceitar códigos com 6-12 caracteres alfanuméricos
    const cleanCode = rawPairingCode.toString().trim();
    
    // Se o código parece ser base64 ou tem caracteres especiais, tentar extrair apenas alfanuméricos
    if (cleanCode.includes('@') || cleanCode.includes('=') || cleanCode.includes('/') || cleanCode.includes('+')) {
      console.log('[WA Manager] 🚨 Pairing code parece ser codificado, tentando extrair parte válida');
      
      // Tentar extrair apenas a primeira parte antes de @ ou =
      const parts = cleanCode.split(/[@=,\/\+]/);
      for (const part of parts) {
        const alphanumericPart = part.replace(/[^A-Z0-9]/gi, '');
        if (alphanumericPart.length >= 6 && alphanumericPart.length <= 12) {
          console.log('[WA Manager] ✅ Parte válida extraída:', alphanumericPart);
          return alphanumericPart.toUpperCase();
        }
      }
    }
    
    // Validação direta para códigos já limpos
    const alphanumericCode = cleanCode.replace(/[^A-Z0-9]/gi, '').toUpperCase();
    
    if (alphanumericCode.length >= 6 && alphanumericCode.length <= 12) {
      console.log('[WA Manager] ✅ Pairing code válido:', alphanumericCode);
      return alphanumericCode;
    }
    
    console.log('[WA Manager] ❌ Pairing code inválido - comprimento:', alphanumericCode.length, 'conteúdo:', alphanumericCode);
    return null;
  }, []);

  // CORREÇÃO: Renovar códigos com melhor validação do pairing code
  const renewCodes = useCallback(async (instanceName: string) => {
    if (!isMountedRef.current) return;
    
    console.log('[WA Manager] Renovando códigos para:', instanceName);
    
    try {
      const result: ConnectionResult = await generateConnectionCodes(instanceName);

      if (result.success && (result.qrCode || result.pairingCode)) {
        console.log('[WA Manager] Códigos renovados com sucesso');
        console.log('[WA Manager] 🚨 DEBUG - Raw pairing code:', result.pairingCode);
        
        // CORREÇÃO: Usar validação flexível
        const validPairingCode = validateAndCleanPairingCode(result.pairingCode);
        
        setState(prev => ({
          ...prev,
          qrCode: result.qrCode || null,
          pairingCode: validPairingCode,
          message: 'Códigos renovados - use qualquer um dos métodos para conectar',
          hasConnectionError: false,
          errorCount: 0
        }));
        
        // Reiniciar contador
        startCountdown();
        
      } else {
        console.log('[WA Manager] Falha ao renovar códigos:', result.error);
        setState(prev => ({
          ...prev,
          hasConnectionError: true,
          errorCount: prev.errorCount + 1,
          message: `Erro ao renovar códigos: ${result.error}`
        }));
      }
    } catch (error: any) {
      console.error('[WA Manager] Erro ao renovar códigos:', error);
      setState(prev => ({
        ...prev,
        hasConnectionError: true,
        errorCount: prev.errorCount + 1,
        message: `Erro de conexão: ${error.message}`
      }));
    }
  }, [startCountdown, validateAndCleanPairingCode]);

  // CORREÇÃO: Polling simplificado sem reinicialização
  const startPolling = useCallback((instanceName: string) => {
    console.log('[WA Manager] Iniciando polling para:', instanceName);
    
    if (!isMountedRef.current) return;
    
    // Limpar apenas os timers sem resetar o estado
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
          hasConnectionError: false,
          errorCount: 0,
          countdownSeconds: 60
        }));
        toast({ 
          title: "✅ Conectado!", 
          description: "Seu WhatsApp foi conectado com sucesso.", 
          duration: 3000 
        });
        await refreshProfile();
      }
    };

    // Primeira verificação após 3 segundos
    setTimeout(checkStatus, 3000);
    
    // Polling regular a cada 7 segundos
    pollingIntervalRef.current = setInterval(checkStatus, 7000);

    // Renovação automática dos códigos a cada 60 segundos
    codeRenewalIntervalRef.current = setInterval(() => {
      renewCodes(instanceName);
    }, 60000);

  }, [checkConnectionAndUpdate, cleanupResources, refreshProfile, toast, renewCodes]);

  // CORREÇÃO: Gerar códigos de conexão com validação melhorada
  const handleGenerateCodes = useCallback(async (instanceName: string) => {
    console.log(`[WA Manager] Gerando códigos para:`, instanceName);
    setState(prev => ({ 
      ...prev, 
      isLoading: true, 
      message: `Gerando códigos de conexão...`,
      hasConnectionError: false
    }));
    
    try {
      const result: ConnectionResult = await generateConnectionCodes(instanceName);

      console.log('[WA Manager] Resultado dos códigos:', { 
        success: result.success, 
        hasQR: !!result.qrCode, 
        hasPairing: !!result.pairingCode, 
        state: result.state,
        pairingCodeLength: result.pairingCode?.length,
        rawPairingCode: result.pairingCode
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
          errorCount: 0
        }));
        return;
      }

      if (result.success && (result.qrCode || result.pairingCode)) {
        console.log('[WA Manager] Códigos recebidos, validando pairing code...');
        console.log('[WA Manager] 🚨 DEBUG - Raw pairing code:', result.pairingCode);
        
        // CORREÇÃO: Usar validação flexível
        const validPairingCode = validateAndCleanPairingCode(result.pairingCode);
        
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
            : 'Gerando novos códigos...',
          isLoading: false,
          hasConnectionError: false,
          errorCount: 0
        }));
        
        startCountdown();
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
        isLoading: false,
        hasConnectionError: true,
        errorCount: prev.errorCount + 1
      }));
    }
  }, [startPolling, startCountdown, validateAndCleanPairingCode]);

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
      hasConnectionError: false
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
        errorCount: prev.errorCount + 1
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
        qrCode: null,
        pairingCode: null,
        message: 'WhatsApp desconectado com sucesso.',
        hasConnectionError: false,
        errorCount: 0,
        countdownSeconds: 60
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
      await renewCodes(profile.instance_name);
    }
  }, [profile?.instance_name, state.connectionState, renewCodes]);

  // CORREÇÃO: useEffect de inicialização controlado para evitar loops
  useEffect(() => {
    // Evitar múltiplas inicializações
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
            errorCount: 0
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
  }, [profile?.id, profile?.numero, profile?.instance_name]); // Dependências específicas para evitar loops

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
  };
};
