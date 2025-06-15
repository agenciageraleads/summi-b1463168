// Refatorado: Hook principal para gerenciar a conexão WhatsApp Business (mantendo toda a lógica anterior)
// Agora utiliza subhooks para estado inicial, polling/timers e ações do usuário.
import { useState, useEffect, useRef, useCallback } from 'react';
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

// Tipos originais preservados
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

  // Refs para controle de timers e flags de estado
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const qrTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);
  const hasInitializedRef = useRef(false);
  const isInitializingRef = useRef(false);
  const isCheckingConnectionRef = useRef(false);

  // Estado simples, sempre atualizado para conferir transições
  const prevConnectionStateRef = useRef<ConnectionState>('needs_phone_number');

  // NOVO: Flag para garantir polling seguro (evita múltiplos intervalos)
  const isPollingActiveRef = useRef(false);

  // Flag para garantir que a checagem automática só roda uma vez por sessão
  const didAutoCheckRef = useRef(false);

  // NOVO: Ref para travar chamada automática única do handleConnect
  const didAutoConnectRef = useRef(false);

  // Ref para limitar tentativas automáticas de retry
  const autoRetryCountRef = useRef(0);

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
    isPollingActiveRef.current = false;
    setState(prev => ({
      ...prev,
      isPolling: false,
    }));
  }, []);

  /**
   * Checa conexão/estado e para polling se já conectado, nunca repete toast.
   */
  const checkConnectionAndUpdate = useCallback(async (instanceName: string) => {
    // Não roda se já rodando ou desmontou
    if (!isMountedRef.current || isCheckingConnectionRef.current) return false;
    isCheckingConnectionRef.current = true;

    try {
      const statusResult = await checkConnectionStatus(instanceName);
      const connectionState = statusResult.state || statusResult.status;
      const isConnected = statusResult.success && ['open', 'connected'].includes(connectionState);

      // Debug: sempre imprime a situação antes de qualquer decisão
      console.log(
        '[WA Manager] Estado detectado:', 
        { connectionState, prev: prevConnectionStateRef.current, isPolling: state.isPolling, isConnected }
      );

      if (isConnected) {
        // Se não estava conectado antes, mudamos para conectado (transição real)
        if (prevConnectionStateRef.current !== 'already_connected') {
          // Parar polling ANTES de atualizar o state!
          stopPolling();
          prevConnectionStateRef.current = 'already_connected';

          setState(prev => ({
            ...prev,
            connectionState: 'already_connected',
            qrCode: null,
            message: 'WhatsApp conectado e funcionando!',
            isLoading: false,
            isPolling: false,
          }));

          await refreshProfile();

          toast({
            title: "✅ Conectado!",
            description: "WhatsApp conectado com sucesso",
            duration: 3000,
          });

          // Nunca mais roda polling para esse ciclo enquanto continuar conectado
          return true;
        } else {
          // Já conectado anteriormente, apenas garante que polling está parado
          stopPolling();
          setState(prev => ({
            ...prev,
            connectionState: 'already_connected',
            qrCode: null,
            message: 'WhatsApp conectado e funcionando!',
            isLoading: false,
            isPolling: false,
          }));
          return true;
        }
      } else {
        // Se perdeu conexão, registra isso no ref para não exibir toast de novo ao reconectar depois
        if (prevConnectionStateRef.current === 'already_connected') {
          prevConnectionStateRef.current = 'needs_qr_code';
        }
        // Atualiza para permitir reconectar
        setState(prev => ({
          ...prev,
          connectionState: 'needs_qr_code',
          qrCode: null,
          message: 'Perdeu conexão, reconecte com o WhatsApp.',
          isLoading: false,
          isPolling: false,
        }));
        return false;
      }
    } catch (error) {
      stopPolling();
      setState(prev => ({
        ...prev,
        connectionState: 'error',
        qrCode: null,
        message: 'Erro ao checar status do WhatsApp',
        isLoading: false,
        isPolling: false,
      }));
      return false;
    } finally {
      isCheckingConnectionRef.current = false;
    }
  }, [refreshProfile, stopPolling, toast, state.isPolling]);

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
        // Garantir que para TUDO e SÓ exibe o toast se realmente mudou de estado!
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
   * Polling só inicia quando explicitamente mandado por ação do usuário!
   * Quando conecta, para TUDO e nunca mais faz polling automático enquanto usuário não clicar.
   */
  const startPolling = useCallback((instanceName: string) => {
    // Garante apenas 1 polling rodando
    if (!isMountedRef.current) return;
    if (isPollingActiveRef.current) {
      console.log('[WhatsApp Manager] Polling já ativo, não inicia novo.');
      return;
    }

    // Se já está conectado, polling nunca roda
    if (
      prevConnectionStateRef.current === 'already_connected' ||
      state.connectionState === 'already_connected'
    ) {
      stopPolling();
      return;
    }
    stopPolling();

    isPollingActiveRef.current = true;
    setState(prev => ({ ...prev, isPolling: true }));
    // Primeira checagem (com delay para UX)
    setTimeout(() => {
      if (isMountedRef.current && isPollingActiveRef.current) {
        checkConnectionAndUpdate(instanceName);
      }
    }, 3000);

    // Polling regular: a cada 7s (nunca executa se já conectado, checado no callback)
    pollingIntervalRef.current = setInterval(async () => {
      // Segurança extra: nunca roda polling se já conectado!
      if (
        !isMountedRef.current ||
        !isPollingActiveRef.current ||
        prevConnectionStateRef.current === 'already_connected' ||
        state.connectionState === 'already_connected'
      ) {
        console.log('[WhatsApp Manager] Parando polling porque conectou! 🚦');
        stopPolling();
        return;
      }
      await checkConnectionAndUpdate(instanceName);
    }, 7000);

    // Timer para expiração do QR Code (AUMENTADO para 65s, antes era 45s)
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
    }, 65000);
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
  const handleConnect = useCallback(async (isAutoRetry?: boolean) => {
    console.log('[WhatsApp Manager] 🚀 Tentativa de conexão iniciada', { isAutoRetry });

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

    try {
      // Se já tem instância, checa status primeiro
      if (profile.instance_name) {
        console.log('[WhatsApp Manager] Verificando se já está conectado...');

        // CORREÇÃO: Aguardar o resultado antes de prosseguir
        const isAlreadyConnected = await checkConnectionAndUpdate(profile.instance_name);

        if (isAlreadyConnected) {
          console.log('[WhatsApp Manager] Já estava conectado!');
          autoRetryCountRef.current = 0;
          return; // Para aqui se já conectado - não tenta gerar QR
        }

        // Se chegou aqui, não está conectado, então tenta gerar QR
        console.log('[WhatsApp Manager] Não estava conectado, gerando QR...');
        const qrResult = await generateQRCode(profile.instance_name);

        // Detecta erro de "instance not found" vindo da função
        if (
          isAutoRetry &&
          qrResult.error &&
          typeof qrResult.error === "string" &&
          (qrResult.error.toLowerCase().includes("instance not found") ||
            qrResult.error.toLowerCase().includes("not found"))
        ) {
          // Se ainda pode tentar, aguarda 3s e tenta de novo
          if (autoRetryCountRef.current < 2) {
            autoRetryCountRef.current += 1;
            console.log('[WhatsApp Manager] Tentativa automática:', autoRetryCountRef.current);
            setTimeout(() => {
              // Só tenta se o componente ainda está montado
              if (isMountedRef.current) {
                handleConnect(true);
              }
            }, 3000);
          } else {
            // Limite superado, exibe mensagem de erro normal
            setState(prev => ({
              ...prev,
              connectionState: 'needs_qr_code',
              isLoading: false,
              message: 'Falha ao gerar QR Code, tente novamente manualmente.',
              qrCode: null,
              isPolling: false
            }));
          }
          return;
        }

        // Resetar retry se não houve esse erro
        autoRetryCountRef.current = 0;

        // Se já conectado durante geração do QR, não prossegue
        if (qrResult.state === 'already_connected') return;
        
      } else {
        // Se não tem instance_name, inicializa conexão
        const result = await initializeWhatsAppConnection();
        if (
          isAutoRetry &&
          result.error &&
          typeof result.error === "string" &&
          (result.error.toLowerCase().includes("instance not found") ||
            result.error.toLowerCase().includes("not found"))
        ) {
          // Quando criar instância falha por "not found" (raro), re-tentar rápido
          if (autoRetryCountRef.current < 2) {
            autoRetryCountRef.current += 1;
            console.log('[WhatsApp Manager] Tentativa automática (init):', autoRetryCountRef.current);
            setTimeout(() => {
              if (isMountedRef.current) {
                handleConnect(true);
              }
            }, 3000);
          } else {
            setState(prev => ({
              ...prev,
              connectionState: 'needs_qr_code',
              isLoading: false,
              message: 'Falha ao inicializar conexão, tente novamente manualmente.',
              qrCode: null,
              isPolling: false
            }));
          }
          return;
        }
        autoRetryCountRef.current = 0;
        await refreshProfile();
      }
    } catch (catchErr) {
      // Falha inesperada, só resetar retry para não travar
      autoRetryCountRef.current = 0;
      setState(prev => ({
        ...prev,
        connectionState: 'error',
        isLoading: false,
        message: 'Erro inesperado ao conectar. Tente novamente.'
      }));
    }
  }, [profile, toast, stopPolling, state.isLoading, checkConnectionAndUpdate, refreshProfile, initializeConnection, setState]);

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

  // Atualizar estado baseado no perfil. 
  // ATENÇÃO: Aqui, além de ajustar o estado, agora fazemos UMA tentativa automática de checagem da conexão com a Evolution API,
  // mas só se o perfil tiver instance_name, ainda não estivermos conectados e ainda não tiver rodado essa verificação automática.
  useEffect(() => {
    if (!profile || hasInitializedRef.current || isInitializingRef.current) return;

    const initialState = getInitialStateFromProfile();

    setState(prev => ({
      ...prev,
      connectionState: initialState.connectionState,
      message: initialState.message,
      instanceName: initialState.instanceName || null
    }));

    // Executa UMA tentativa automática de verificação de status se tem instance_name,
    // não está conectado e ainda não rodou nenhuma tentativa.
    if (
      profile.instance_name &&
      initialState.connectionState !== 'already_connected' &&
      !didAutoCheckRef.current
    ) {
      didAutoCheckRef.current = true;
      // Rodar checkConnectionAndUpdate e atualizar o estado corretamente (sem polling)
      checkConnectionAndUpdate(profile.instance_name).then(isConnected => {
        if (isConnected) {
          // Garante visual limpo quando já está conectado: sem mensagem de Polling
          setState(prev => ({
            ...prev,
            connectionState: 'already_connected',
            isPolling: false,
            qrCode: null,
            message: 'WhatsApp conectado e funcionando!',
            isLoading: false
          }));
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, getInitialStateFromProfile]);

  // Efeito para inicialização automática otimizado:
  // Só dispara handleConnect UMA ÚNICA VEZ por montagem/página, evitando disparo duplicado
  useEffect(() => {
    if (
      !state.isLoading &&
      !state.isPolling &&
      !didAutoConnectRef.current && // Garante que SÓ INICIA UMA VEZ
      (state.connectionState === 'needs_phone_number' ||
        state.connectionState === 'needs_qr_code' ||
        state.connectionState === 'error')
    ) {
      if (profile?.numero) {
        didAutoConnectRef.current = true; // Travar para não duplicar
        autoRetryCountRef.current = 0; // Resetar retry a cada abertura
        handleConnect(true); // Marcando como automática (permitido retry)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.connectionState, profile?.numero]);

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
    handleConnect: () => handleConnect(false), // para uso manual sempre desativa retry
    handleDisconnect,
    handleGenerateQR,
    getStateMessage
  };
};
