// Hook principal para gerenciar toda a conexão WhatsApp - VERSÃO CORRIGIDA DEFINITIVA
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

  // Refs para controle de timers e flags de estado
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const qrTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);
  const hasInitializedRef = useRef(false);
  const isInitializingRef = useRef(false);
  const isCheckingConnectionRef = useRef(false); // NOVO: Previne múltiplas verificações simultâneas

  // Função para determinar estado inicial baseado no perfil
  const getInitialStateFromProfile = useCallback(() => {
    console.log('[WhatsApp Manager] 🔍 Determinando estado inicial do perfil:', profile);
    
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
        connectionState: 'needs_qr_code' as ConnectionState,
        message: 'Clique em "Conectar WhatsApp" para verificar conexão',
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

  /**
   * Para polling/timers de forma confiável
   */
  const stopPolling = useCallback(() => {
    console.log('[WhatsApp Manager] 🛑 Parando polling (definitivo)...');
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    if (qrTimeoutRef.current) {
      clearTimeout(qrTimeoutRef.current);
      qrTimeoutRef.current = null;
    }
    setState(prev => ({
      ...prev,
      isPolling: false,
    }));
  }, []);

  /**
   * Gera QR Code e dispara polling
   */
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
      } else if (result.state === 'already_connected') {
        // Garantir que para TUDO e SÓ exiba o toast se realmente mudou de estado!
        stopPolling();
        setState(prev => ({
          ...prev,
          connectionState: 'already_connected',
          message: result.message || 'WhatsApp já conectado',
          isLoading: false,
          qrCode: null,
          isPolling: false
        }));

        await refreshProfile();

        // Só notifica se não estava estável!
        if (state.connectionState !== 'already_connected') {
          toast({
            title: "✅ Já Conectado",
            description: "WhatsApp já estava conectado",
            duration: 3000
          });
        }
      } else {
        setState(prev => ({
          ...prev,
          connectionState: 'error',
          message: result.error || 'Erro ao gerar QR Code',
          isLoading: false
        }));
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        connectionState: 'error',
        message: 'Erro inesperado ao gerar QR Code',
        isLoading: false
      }));
    }
  // state.connectionState depende do valor anterior, mas no polling isso é ok pois já vai ficar estável
  // deps: stopPolling, refreshProfile, toast, state.connectionState
  }, [stopPolling, refreshProfile, toast, state.connectionState]);

  /**
   * Checa conexão e para polling/atualiza de forma segura
   */
  const checkConnectionAndUpdate = useCallback(async (instanceName: string) => {
    if (!isMountedRef.current || isCheckingConnectionRef.current) return false;
    isCheckingConnectionRef.current = true;
    try {
      const statusResult = await checkConnectionStatus(instanceName);
      const connectionState = statusResult.state || statusResult.status;
      const isConnected = statusResult.success && ['open', 'connected'].includes(connectionState);

      // Corrigido: se já está conectado E NÃO ESTAVA, notifica uma VÊZ e para polling
      if (isConnected) {
        const wasNotConnected = state.connectionState !== 'already_connected';
        // Para polling 100%!
        stopPolling();
        setState(prev => ({
          ...prev,
          connectionState: 'already_connected',
          qrCode: null,
          message: 'WhatsApp conectado e funcionando!',
          isLoading: false,
          isPolling: false,
        }));
        if (wasNotConnected) {
          await refreshProfile();
          toast({
            title: "✅ Conectado!",
            description: "WhatsApp conectado com sucesso",
            duration: 3000,
          });
        }
        return true;
      }
      // Se NAO conectado, permite continuar polling
      return false;
    } catch (error) {
      return false;
    } finally {
      isCheckingConnectionRef.current = false;
    }
  }, [refreshProfile, stopPolling, state.connectionState, toast]);

  /**
   * Polling seguro: nunca roda mais de uma vez, para ao conectar
   */
  const startPolling = useCallback((instanceName: string) => {
    if (!isMountedRef.current) return;
    stopPolling(); // Garante: nunca dois intervalos
    setState(prev => ({ ...prev, isPolling: true }));

    // Verificação rápida após 3s
    setTimeout(() => {
      if (isMountedRef.current) {
        checkConnectionAndUpdate(instanceName);
      }
    }, 3000);

    qrTimeoutRef.current = setTimeout(async () => {
      if (!isMountedRef.current) return;
      stopPolling();
      setState(prev => ({
        ...prev,
        message: 'QR Code expirado, reiniciando...',
        qrCode: null,
      }));
      const restartResult = await restartInstance(instanceName);
      if (restartResult.success) {
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
          isPolling: false,
        }));
      }
    }, 45000);

    pollingIntervalRef.current = setInterval(async () => {
      if (!isMountedRef.current) return;
      // Corrigida: para polling se já está conectado!
      if (
        state.connectionState === 'already_connected' ||
        !isMountedRef.current
      ) {
        stopPolling();
        return;
      }
      await checkConnectionAndUpdate(instanceName);
    }, 7000);
  }, [checkConnectionAndUpdate, stopPolling, handleGenerateQR, state.connectionState]);

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
    console.log('[WhatsApp Manager] 🚀 Tentativa de conexão iniciada');

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

    // Parar qualquer polling anterior
    stopPolling();

    setState(prev => ({
      ...prev,
      isLoading: true,
      connectionState: 'is_connecting',
      message: 'Conectando...',
      qrCode: null
    }));

    // Verificar primeiro se já está conectado
    if (profile.instance_name) {
      console.log('[WhatsApp Manager] Verificando se já está conectado...');
      const isAlreadyConnected = await checkConnectionAndUpdate(profile.instance_name);
      
      if (isAlreadyConnected) {
        console.log('[WhatsApp Manager] Já estava conectado!');
        return;
      }
      
      // Se não está conectado, gerar novo QR
      await handleGenerateQR(profile.instance_name);
    } else {
      // Se não tem instance_name, inicializar conexão
      await initializeConnection();
      await refreshProfile();
    }
  }, [profile, toast, stopPolling, state.isLoading, checkConnectionAndUpdate, handleGenerateQR, refreshProfile]);

  // Desconectar WhatsApp
  const handleDisconnect = useCallback(async () => {
    console.log('[WhatsApp Manager] Iniciando desconexão...');
    setState(prev => ({ ...prev, isLoading: true, message: 'Desconectando...' }));
    stopPolling();

    try {
      const result = await disconnectWhatsApp();

      if (result.success) {
        setState(prev => ({
          ...prev,
          connectionState: 'needs_qr_code',
          isLoading: false,
          qrCode: null,
          message: 'WhatsApp desconectado. Clique em "Conectar" para reconectar.',
          isPolling: false
        }));

        hasInitializedRef.current = false;
        isInitializingRef.current = false;

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

        toast({
          title: "Erro na Desconexão",
          description: result.error || 'Erro ao desconectar WhatsApp',
          variant: "destructive"
        });
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
  }, [stopPolling, toast]);

  // Obter mensagem padrão para cada estado
  const getStateMessage = (connectionState: ConnectionState): string => {
    switch (connectionState) {
      case 'needs_phone_number':
        return 'Configure seu número de telefone nas configurações';
      case 'needs_qr_code':
        return 'Clique em "Conectar WhatsApp" para verificar conexão';
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

      // Só inicia uma verificação agora se o status não é already_connected
      if (
        profile.instance_name &&
        state.connectionState !== 'already_connected'
      ) {
        checkConnectionAndUpdate(profile.instance_name);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, getInitialStateFromProfile, checkConnectionAndUpdate]);

  // Cleanup ao desmontar
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      console.log('[WhatsApp Manager] 🧹 Limpando recursos ao desmontar...');
      isMountedRef.current = false;
      isCheckingConnectionRef.current = false;
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
