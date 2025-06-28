// Hook principal para gerenciar a conexão WhatsApp Business - VERSÃO COM PAIRING CODE
import { useState, useEffect, useRef, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useProfile } from '@/hooks/useProfile';
import { supabase } from '@/integrations/supabase/client';
import {
  initializeWhatsAppConnection,
  generateQRCode,
  checkConnectionStatus,
  deleteWhatsAppInstance,
  restartInstance,
  ConnectionResult,
} from '@/services/whatsappConnection';

// Tipos
export type ConnectionState = 'needs_phone_number' | 'needs_pairing_code' | 'needs_qr_code' | 'is_connecting' | 'already_connected' | 'error';
export interface WhatsAppManagerState {
  connectionState: ConnectionState;
  isLoading: boolean;
  pairingCode: string | null; // NOVO: Código de pareamento
  qrCode: string | null;
  instanceName: string | null;
  message: string;
  isPolling: boolean;
  showQrFallback: boolean; // NOVO: Controle para mostrar QR Code como fallback
}

export const useWhatsAppManager = () => {
  const { toast } = useToast();
  const { profile, refreshProfile } = useProfile();

  // Estado principal do hook - MODIFICADO para incluir pairing code
  const [state, setState] = useState<WhatsAppManagerState>({
    connectionState: 'needs_phone_number',
    isLoading: false,
    pairingCode: null, // NOVO
    qrCode: null,
    instanceName: null,
    message: 'Verificando estado da conexão...',
    isPolling: false,
    showQrFallback: false // NOVO
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
    pairingCode: state.pairingCode ? 'Presente' : 'Ausente', // NOVO
    qrCode: state.qrCode ? 'Presente' : 'Ausente',
    showQrFallback: state.showQrFallback, // NOVO
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
  
  // CORREÇÃO CRÍTICA: Define o estado como conectado de forma definitiva e protegida
  const setConnectedStateDefinitively = useCallback(() => {
    console.log('[WA Manager] ✅ Definindo como conectado definitivamente');
    isDefinitivelyConnectedRef.current = true;
    stopPolling();
    if (isMountedRef.current) {
      setState(prev => ({
        ...prev,
        connectionState: 'already_connected',
        pairingCode: null, // LIMPAR pairing code quando conectado
        qrCode: null,
        message: 'WhatsApp conectado e funcionando!',
        isLoading: false,
        isPolling: false,
        showQrFallback: false // RESETAR fallback
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

    // Timeout para expiração do código - 60 segundos
    qrTimeoutRef.current = setTimeout(async () => {
      if (!isMountedRef.current || isDefinitivelyConnectedRef.current) return;
      console.log('[WA Manager] ⏰ Código expirado, sugerindo recriação...');
      stopPolling();
      setState(prev => ({ 
        ...prev, 
        message: 'Código expirado. Clique em "Gerar novo código" para continuar.',
        isPolling: false 
      }));
    }, 60000);

  }, [stopPolling, checkConnectionAndUpdate]);

  // Atualiza a ref
  startPollingRef.current = startPolling;
  
  // NOVO: Função para recriar instância e gerar novo pairing code
  const handleRecreateForPairingCode = useCallback(async () => {
    console.log('[WA Manager] 🔄 Recriando instância para novo pairing code...');
    
    if (state.isLoading) {
      console.log('[WA Manager] ⏳ Já carregando, ignorando...');
      return;
    }

    setState(prev => ({ 
      ...prev, 
      isLoading: true, 
      message: 'Gerando novo código de pareamento...',
      pairingCode: null,
      qrCode: null
    }));

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) throw new Error('Usuário não autenticado');

      const { data, error } = await supabase.functions.invoke('evolution-api-handler', {
        body: { action: 'recreate-for-pairing-code' },
        headers: {
          Authorization: `Bearer ${sessionData.session.access_token}`,
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Erro ao recriar instância');

      console.log('[WA Manager] ✅ Nova instância criada:', data);

      setState(prev => ({
        ...prev,
        connectionState: 'needs_pairing_code',
        pairingCode: data.pairingCode,
        qrCode: data.qrCode,
        instanceName: data.instanceName,
        message: 'Novo código gerado com sucesso!',
        isLoading: false,
        showQrFallback: false
      }));

      // Iniciar polling para nova instância
      if (data.instanceName) {
        startPolling(data.instanceName);
      }

      toast({
        title: "Novo código gerado",
        description: "Use o novo código de pareamento para conectar.",
        duration: 5000
      });

    } catch (error: any) {
      console.error('[WA Manager] ❌ Erro ao recriar instância:', error);
      setState(prev => ({ 
        ...prev, 
        connectionState: 'error', 
        isLoading: false, 
        message: error.message || 'Erro ao gerar novo código' 
      }));
      toast({ 
        title: "Erro", 
        description: error.message || 'Erro ao gerar novo código', 
        variant: 'destructive' 
      });
    }
  }, [state.isLoading, startPolling, toast]);

  // NOVO: Função para alternar para QR Code como fallback
  const handleToggleQrFallback = useCallback(() => {
    console.log('[WA Manager] 🔄 Alternando para QR Code fallback');
    setState(prev => ({ 
      ...prev, 
      showQrFallback: !prev.showQrFallback,
      message: prev.showQrFallback ? 'Use o código de pareamento ou QR Code para conectar' : 'Escaneie o QR Code com seu WhatsApp'
    }));
  }, []);

  // Gera QR Code e inicia o polling - MODIFICADO para incluir pairing code
  const handleGenerateQR = useCallback(async (instanceName: string) => {
    console.log('[WA Manager] 📱 Gerando códigos para:', instanceName);
    setState(prev => ({ ...prev, isLoading: true, message: 'Gerando códigos de conexão...' }));
    
    try {
      const result: ConnectionResult = await generateQRCode(instanceName);
      console.log('[WA Manager] 📨 Resultado dos códigos:', { 
        success: result.success, 
        hasPairingCode: !!result.pairingCode, // NOVO
        hasQR: !!result.qrCode, 
        state: result.state,
        connectionState: result.state
      });

      // CORREÇÃO: Verificar se já está conectado usando result.state = 'already_connected'
      if (result.state === 'already_connected') {
        console.log('[WA Manager] ✅ Já conectado detectado na geração');
        setConnectedStateDefinitively();
        return;
      }

      if (result.success && (result.pairingCode || result.qrCode)) {
        console.log('[WA Manager] ✅ Códigos recebidos, exibindo na tela');
        setState(prev => ({
          ...prev,
          connectionState: 'needs_pairing_code', // PRIORIZAR pairing code
          pairingCode: result.pairingCode || null, // NOVO
          qrCode: result.qrCode || null,
          message: result.pairingCode 
            ? 'Use o código de pareamento ou QR Code para conectar' 
            : 'Escaneie o QR Code com seu WhatsApp',
          isLoading: false,
          showQrFallback: false // INICIAR com pairing code em destaque
        }));
        startPolling(instanceName);
      } else {
        throw new Error(result.error || 'Falha ao gerar códigos de conexão.');
      }
    } catch (error: any) {
      console.error('[WA Manager] ❌ Erro ao gerar códigos:', error);
      setState(prev => ({ 
        ...prev, 
        connectionState: 'error', 
        message: error.message, 
        isLoading: false 
      }));
    }
  }, [setConnectedStateDefinitively, startPolling]);

  // Ação principal de conexão - MODIFICADO para priorizar pairing code
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
      pairingCode: null, // LIMPAR códigos anteriores
      qrCode: null,
      showQrFallback: false
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
          
          // NOVO: Verificar se já veio com pairing code
          if (initResult.pairingCode || initResult.qrCode) {
            setState(prev => ({
              ...prev,
              connectionState: 'needs_pairing_code',
              pairingCode: initResult.pairingCode || null,
              qrCode: initResult.qrCode || null,
              instanceName: instanceName,
              message: initResult.pairingCode 
                ? 'Use o código de pareamento ou QR Code para conectar'
                : 'Escaneie o QR Code com seu WhatsApp',
              isLoading: false,
              showQrFallback: false
            }));
            startPolling(instanceName);
            return;
          }
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
      
      // Passo 3: Gerar códigos (pairing code + QR code)
      setState(prev => ({ ...prev, message: 'Gerando códigos de conexão...' }));
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
  }, [profile, state.isLoading, toast, stopPolling, refreshProfile, checkConnectionAndUpdate, handleGenerateQR, startPolling]);

  // MODIFICADO: Desconectar WhatsApp - Agora DELETA a instância completamente
  const handleDisconnect = useCallback(async () => {
    console.log('[WA Manager] 🗑️ Iniciando DELEÇÃO completa da instância...');
    if (!profile?.instance_name) return;
    
    setState(prev => ({ ...prev, isLoading: true, message: 'Deletando instância...' }));
    stopPolling();
    
    try {
      // MODIFICADO: Usar deleteWhatsAppInstance em vez de disconnectWhatsApp
      await deleteWhatsAppInstance();
      isDefinitivelyConnectedRef.current = false;
      hasAutoConnectedRef.current = false;
      
      // MODIFICADO: Resetar COMPLETAMENTE o estado para início do fluxo
      setState(prev => ({
        ...prev,
        connectionState: 'needs_phone_number', // CORRIGIDO: Volta ao estado inicial
        isLoading: false,
        isPolling: false,
        pairingCode: null,
        qrCode: null,
        instanceName: null,
        message: 'WhatsApp desconectado. Instância deletada com sucesso.',
        showQrFallback: false
      }));
      
      // NOVO: Forçar refresh do perfil para garantir que instance_name foi limpo
      await refreshProfile();
      
      toast({ 
        title: "Desconectado", 
        description: "Instância WhatsApp deletada. Você pode conectar novamente quando quiser." 
      });
    } catch (error: any) {
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        message: error.message || 'Erro ao deletar instância' 
      }));
      toast({ 
        title: "Erro", 
        description: error.message, 
        variant: "destructive" 
      });
    }
  }, [profile, stopPolling, refreshProfile, toast]);

  // ... keep existing code (useEffect hooks for profile and auto-connection) the same

  // CORREÇÃO CRÍTICA: Estado inicial baseado no perfil - com proteção contra sobrescrita
  useEffect(() => {
    if (!profile) return;
    
    // IMPORTANTE: Não atualizar o estado se já estamos definitivamente conectados
    if (isDefinitivelyConnectedRef.current) {
      console.log('[WA Manager] 🛡️ Perfil carregado mas já conectado - mantendo estado atual');
      return;
    }
    
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
        connectionState: 'needs_pairing_code', // MODIFICADO: priorizar pairing code
        message: 'Pronto para conectar', 
        instanceName: profile.instance_name 
      }));
    } else {
      setState(prev => ({ 
        ...prev, 
        connectionState: 'needs_pairing_code', // MODIFICADO: priorizar pairing code
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
    handleRecreateForPairingCode,
    handleToggleQrFallback,
  };
};
