// Hook principal para gerenciar toda a conexão WhatsApp - VERSÃO COM DETECÇÃO CORRIGIDA
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

  // Parar polling
  const stopPolling = useCallback(() => {
    console.log('[WhatsApp Manager] 🛑 Parando polling...');
    setState(prev => ({ ...prev, isPolling: false }));
    clearTimers();
  }, [clearTimers]);

  // CORREÇÃO PRINCIPAL: Função melhorada para verificar status da conexão
  const checkConnectionAndUpdate = useCallback(async (instanceName: string) => {
    if (!isMountedRef.current) return false;
    
    try {
      console.log('[WhatsApp Manager] 🔍 Verificando status da conexão para:', instanceName);
      const statusResult = await checkConnectionStatus(instanceName);
      
      console.log('[WhatsApp Manager] 📊 Status recebido:', {
        success: statusResult.success,
        status: statusResult.status,
        rawResult: statusResult
      });
      
      // CORREÇÃO: Verificar tanto 'open' quanto 'connected'
      const isConnected = statusResult.success && (statusResult.status === 'open' || statusResult.status === 'connected');
      
      if (isConnected) {
        console.log('[WhatsApp Manager] ✅ CONEXÃO DETECTADA! Atualizando estado...');
        
        // Parar polling imediatamente
        stopPolling();
        
        // Atualizar estado para conectado
        setState(prev => {
          console.log('[WhatsApp Manager] 🔄 Estado anterior:', prev.connectionState);
          console.log('[WhatsApp Manager] 🔄 Novo estado: already_connected');
          return {
            ...prev,
            connectionState: 'already_connected',
            qrCode: null,
            message: 'WhatsApp conectado com sucesso!',
            isLoading: false,
            isPolling: false
          };
        });
        
        // Atualizar perfil para garantir consistência
        await refreshProfile();
        
        toast({
          title: "✅ Conectado!",
          description: "WhatsApp conectado com sucesso",
          duration: 3000
        });
        
        return true;
      } else {
        console.log('[WhatsApp Manager] ⏳ Ainda não conectado, status:', statusResult.status);
        return false;
      }
    } catch (error) {
      console.error('[WhatsApp Manager] ❌ Erro ao verificar status:', error);
      return false;
    }
  }, [stopPolling, refreshProfile, toast]);

  // Sistema de polling otimizado
  const startPolling = useCallback((instanceName: string) => {
    if (!isMountedRef.current) return;
    
    console.log('[WhatsApp Manager] 🔄 Iniciando polling otimizado para:', instanceName);
    setState(prev => ({ ...prev, isPolling: true }));

    // Limpar timers anteriores
    clearTimers();

    // PRIMEIRA verificação imediata (após 2 segundos para dar tempo do QR ser escaneado)
    setTimeout(() => {
      if (isMountedRef.current) {
        checkConnectionAndUpdate(instanceName);
      }
    }, 2000);

    // Timer de 40 segundos para restart automático
    qrTimeoutRef.current = setTimeout(async () => {
      if (!isMountedRef.current) return;
      
      console.log('[WhatsApp Manager] ⏰ Timeout de 40s - reiniciando instância...');
      setState(prev => ({ ...prev, message: 'QR Code expirado, reiniciando...', qrCode: null }));
      
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
    }, 40000);

    // Polling a cada 2 segundos (mais frequente)
    pollingIntervalRef.current = setInterval(async () => {
      if (!isMountedRef.current) return;

      const isConnected = await checkConnectionAndUpdate(instanceName);
      if (isConnected) {
        console.log('[WhatsApp Manager] 🎉 Conexão confirmada, polling será parado automaticamente');
        // O polling já foi parado pela função checkConnectionAndUpdate
        return;
      }
    }, 2000); // Intervalo reduzido para 2 segundos
  }, [clearTimers, checkConnectionAndUpdate]);

  // Gerar QR Code
  const handleGenerateQR = useCallback(async (instanceName: string) => {
    console.log('[WhatsApp Manager] 📱 Gerando QR Code...');
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
        
        // Iniciar polling após gerar QR Code
        console.log('[WhatsApp Manager] 📱 QR Code gerado, iniciando polling...');
        startPolling(instanceName);
      } else if (result.state === 'already_connected') {
        console.log('[WhatsApp Manager] ✅ Instância já conectada!');
        setState(prev => ({
          ...prev,
          connectionState: 'already_connected',
          message: result.message || 'WhatsApp já conectado',
          isLoading: false,
          qrCode: null
        }));
        
        await refreshProfile();
        
        toast({
          title: "✅ Já Conectado",
          description: "WhatsApp já estava conectado",
          duration: 3000
        });
      } else {
        setState(prev => ({
          ...prev,
          connectionState: 'error',
          message: result.error || 'Erro ao gerar QR Code',
          isLoading: false
        }));
      }
    } catch (error) {
      console.error('[WhatsApp Manager] ❌ Erro ao gerar QR:', error);
      setState(prev => ({
        ...prev,
        connectionState: 'error',
        message: 'Erro inesperado ao gerar QR Code',
        isLoading: false
      }));
    }
  }, [startPolling, refreshProfile, toast]);

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

  // Desconectar WhatsApp (apenas logout, mantém instance_name)
  const handleDisconnect = useCallback(async () => {
    console.log('[WhatsApp Manager] Iniciando desconexão...');
    setState(prev => ({ ...prev, isLoading: true, message: 'Desconectando...' }));
    stopPolling();

    try {
      const result = await disconnectWhatsApp();

      if (result.success) {
        // Após logout bem-sucedido, mantém instance_name mas altera estado para needs_qr_code
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
      
      // Se há instance_name, verificar status imediatamente
      if (profile.instance_name) {
        console.log('[WhatsApp Manager] 🔍 Perfil carregado com instance_name, verificando status...');
        checkConnectionAndUpdate(profile.instance_name);
      }
    }
  }, [profile, getInitialStateFromProfile, checkConnectionAndUpdate]);

  // Cleanup ao desmontar
  useEffect(() => {
    return () => {
      console.log('[WhatsApp Manager] 🧹 Limpando recursos...');
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
