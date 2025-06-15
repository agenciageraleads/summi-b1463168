
// Hook principal para gerenciar a conexão WhatsApp Business - VERSÃO CORRIGIDA
import { useState, useEffect, useRef, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useProfile } from '@/hooks/useProfile';
import {
  initializeWhatsAppConnection,
  generateQRCode,
  checkConnectionStatus,
  disconnectWhatsApp,
  restartInstance,
  ConnectionResult,
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

  // Refs para controle de lifecycle
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const qrTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);
  const isCheckingConnectionRef = useRef(false);
  const isPollingActiveRef = useRef(false);
  const hasAutoConnectedRef = useRef(false);
  const isDefinitivelyConnectedRef = useRef(false);

  console.log('[WA Manager] 🎯 Estado atual:', {
    connectionState: state.connectionState,
    hasAutoConnected: hasAutoConnectedRef.current,
    isLoading: state.isLoading,
    qrCode: state.qrCode ? 'Presente' : 'Ausente',
    profileNumero: profile?.numero,
    instanceName: profile?.instance_name,
    isDefinitivelyConnected: isDefinitivelyConnectedRef.current
  });

  // Limpar todos os timers
  const stopPolling = useCallback(() => {
    console.log('[WA Manager] 🛑 Parando polling');
    if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
    if (qrTimeoutRef.current) clearTimeout(qrTimeoutRef.current);
    pollingIntervalRef.current = null;
    qrTimeoutRef.current = null;
    isPollingActiveRef.current = false;
    if (isMountedRef.current) {
      setState(prev => ({ ...prev, isPolling: false }));
    }
  }, []);
  
  // CORREÇÃO PRINCIPAL: Define o estado como conectado de forma definitiva
  const setConnectedStateDefinitively = useCallback(() => {
    console.log('[WA Manager] ✅ Definindo como conectado definitivamente');
    isDefinitivelyConnectedRef.current = true;
    stopPolling();
    if (isMountedRef.current) {
      setState(prev => ({
        ...prev,
        connectionState: 'already_connected', // CORREÇÃO: Garantir que o estado seja atualizado
        qrCode: null,
        message: 'WhatsApp conectado e funcionando!',
        isLoading: false,
        isPolling: false,
      }));
    }
  }, [stopPolling]);

  // CORREÇÃO: Checa o status da conexão e mapeia corretamente os estados
  const checkConnectionAndUpdate = useCallback(async (instanceName: string) => {
    if (!isMountedRef.current || isCheckingConnectionRef.current) return false;
    isCheckingConnectionRef.current = true;

    try {
      console.log('[WA Manager] 🔍 Verificando conexão para:', instanceName);
      const statusResult = await checkConnectionStatus(instanceName);
      
      // CORREÇÃO: Mapear corretamente os estados da API Evolution
      // A API retorna state: "open" quando conectado, mas precisamos mapear para nosso estado
      const apiState = statusResult.state;
      const isConnected = statusResult.success && ['open', 'connected'].includes(apiState || '');
      
      console.log('[WA Manager] 📊 Estado detectado:', { 
        apiState,
        isConnected,
        success: statusResult.success,
        mappingTo: isConnected ? 'already_connected' : 'disconnected'
      });

      if (isConnected) {
        console.log('[WA Manager] ✅ Conexão confirmada - atualizando estado para already_connected');
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
      console.error('[WA Manager] ❌ Erro ao checar status:', error);
      return false;
    } finally {
      isCheckingConnectionRef.current = false;
    }
  }, [refreshProfile, toast, setConnectedStateDefinitively]);

  // Usa ref para startPolling para evitar dependência circular
  const startPollingRef = useRef<((instanceName: string) => void) | null>(null);

  // Inicia o polling para verificar a conexão
  const startPolling = useCallback((instanceName: string) => {
    console.log('[WA Manager] 🔄 Iniciando polling para:', instanceName);
    
    if (!isMountedRef.current || isPollingActiveRef.current || isDefinitivelyConnectedRef.current) {
      console.log('[WA Manager] ❌ Polling cancelado - condições não atendidas');
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
        console.log('[WA Manager] ✅ Conexão detectada no polling - parando');
        stopPolling();
      }
    };

    // Checagem inicial após 3 segundos
    setTimeout(checkAndUpdate, 3000);
    // Polling regular a cada 7 segundos
    pollingIntervalRef.current = setInterval(checkAndUpdate, 7000);

    // Timeout para expiração do QR Code - 60 segundos
    qrTimeoutRef.current = setTimeout(async () => {
      if (!isMountedRef.current || isDefinitivelyConnectedRef.current) return;
      console.log('[WA Manager] ⏰ QR Code expirado, reiniciando...');
      stopPolling();
      setState(prev => ({ ...prev, message: 'QR Code expirado, reiniciando...', qrCode: null }));
      await restartInstance(instanceName);
      setTimeout(() => {
        if (startPollingRef.current) {
          handleGenerateQR(instanceName);
        }
      }, 3000);
    }, 60000);

  }, [stopPolling, checkConnectionAndUpdate]);

  // Atualiza a ref
  startPollingRef.current = startPolling;
  
  // Gera QR Code e inicia o polling
  const handleGenerateQR = useCallback(async (instanceName: string) => {
    console.log('[WA Manager] 📱 Gerando QR Code para:', instanceName);
    setState(prev => ({ ...prev, isLoading: true, message: 'Gerando QR Code...' }));
    
    try {
      const result: ConnectionResult = await generateQRCode(instanceName);
      console.log('[WA Manager] 📨 Resultado do QR:', { 
        success: result.success, 
        hasQR: !!result.qrCode, 
        state: result.state,
        connectionState: result.state
      });

      // CORREÇÃO: Verificar se já está conectado usando result.state = 'already_connected'
      if (result.state === 'already_connected') {
        console.log('[WA Manager] ✅ Já conectado detectado no QR');
        setConnectedStateDefinitively();
        return;
      }

      if (result.success && result.qrCode) {
        console.log('[WA Manager] ✅ QR Code recebido, exibindo na tela');
        setState(prev => ({
          ...prev,
          connectionState: 'needs_qr_code',
          qrCode: result.qrCode!,
          message: 'Escaneie o QR Code com seu WhatsApp',
          isLoading: false
        }));
        startPolling(instanceName);
      } else {
        throw new Error(result.error || 'Falha ao gerar QR Code.');
      }
    } catch (error: any) {
      console.error('[WA Manager] ❌ Erro ao gerar QR:', error);
      setState(prev => ({ 
        ...prev, 
        connectionState: 'error', 
        message: error.message, 
        isLoading: false 
      }));
    }
  }, [setConnectedStateDefinitively, startPolling]);

  // Ação principal de conexão
  const handleConnect = useCallback(async () => {
    console.log('[WA Manager] 🚀 Conectando - verificações iniciais...');

    if (state.isLoading) {
      console.log('[WA Manager] ⏳ Já carregando, ignorando...');
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
      message: 'Iniciando conexão...', 
      qrCode: null 
    }));

    try {
      let instanceName = profile.instance_name;

      // Passo 1: Criar instância se necessário
      if (!instanceName) {
        console.log('[WA Manager] 🔧 Criando nova instância...');
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
      console.log('[WA Manager] 🔍 Verificando status da instância:', instanceName);
      setState(prev => ({ ...prev, message: 'Verificando status da conexão...' }));
      const isConnected = await checkConnectionAndUpdate(instanceName);
      if (isConnected) {
        console.log('[WA Manager] ✅ Já conectado - finalizando');
        return;
      }
      
      // Passo 3: Gerar QR Code
      setState(prev => ({ ...prev, message: 'Gerando QR Code...' }));
      await handleGenerateQR(instanceName);

    } catch (err: any) {
      console.error('[WA Manager] ❌ Erro durante handleConnect:', err);
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
  }, [profile, state.isLoading, toast, stopPolling, refreshProfile, checkConnectionAndUpdate, handleGenerateQR]);

  // Desconectar WhatsApp
  const handleDisconnect = useCallback(async () => {
    console.log('[WA Manager] 🔌 Iniciando desconexão...');
    if (!profile?.instance_name) return;
    
    setState(prev => ({ ...prev, isLoading: true, message: 'Desconectando...' }));
    stopPolling();
    
    try {
      await disconnectWhatsApp();
      isDefinitivelyConnectedRef.current = false;
      hasAutoConnectedRef.current = false;
      
      // CORREÇÃO: Resetar completamente o estado após desconexão
      setState(prev => ({
        ...prev,
        connectionState: 'needs_qr_code',
        isLoading: false,
        isPolling: false,
        qrCode: null,
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
    
    console.log('[WA Manager] 👤 Perfil carregado:', {
      numero: profile.numero,
      instanceName: profile.instance_name,
      hasAutoConnected: hasAutoConnectedRef.current
    });

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

  // Auto-conexão APENAS uma vez quando o perfil carrega com número
  useEffect(() => {
    if (profile?.numero && profile?.instance_name && !hasAutoConnectedRef.current && !isDefinitivelyConnectedRef.current) {
      console.log('[WA Manager] 🤖 Executando auto-conexão inicial...');
      hasAutoConnectedRef.current = true;
      
      // Pequeno delay para evitar corrida entre efeitos
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
      console.log('[WA Manager] 🧹 Limpando recursos...');
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
