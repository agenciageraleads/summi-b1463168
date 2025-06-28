
// ABOUTME: Hook seguro para conexão WhatsApp com validações e auditoria
// ABOUTME: Versão melhorada do useWhatsAppConnection com foco em segurança
import { useState, useEffect, useRef, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useProfile } from '@/hooks/useProfile';
import { useSecurityAuditLogger } from '@/components/Security/SecurityAuditLogger';
import { supabase } from '@/integrations/supabase/client';

export type ConnectionState = 
  | 'NO_CONNECTION'
  | 'AWAITING_CONNECTION'
  | 'CONNECTED'
  | 'ERROR';

export interface SecureWhatsAppConnectionData {
  state: ConnectionState;
  isLoading: boolean;
  pairingCode: string | null;
  qrCode: string | null;
  instanceName: string | null;
  message: string;
  error: string | null;
  lastConnectionAttempt: number | null;
}

// Rate limiting: máximo 3 tentativas por minuto
const RATE_LIMIT_ATTEMPTS = 3;
const RATE_LIMIT_WINDOW = 60000; // 1 minute

export const useSecureWhatsAppConnection = () => {
  const { toast } = useToast();
  const { profile, refreshProfile } = useProfile();
  const { logSecurityEvent } = useSecurityAuditLogger();
  
  const [connectionData, setConnectionData] = useState<SecureWhatsAppConnectionData>({
    state: 'NO_CONNECTION',
    isLoading: false,
    pairingCode: null,
    qrCode: null,
    instanceName: null,
    message: 'Configure seu WhatsApp para começar',
    error: null,
    lastConnectionAttempt: null
  });

  // Rate limiting
  const connectionAttemptsRef = useRef<number[]>([]);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  // Verificar rate limiting
  const checkRateLimit = useCallback((): boolean => {
    const now = Date.now();
    const windowStart = now - RATE_LIMIT_WINDOW;
    
    // Filtrar tentativas dentro da janela de tempo
    connectionAttemptsRef.current = connectionAttemptsRef.current.filter(
      attempt => attempt > windowStart
    );
    
    if (connectionAttemptsRef.current.length >= RATE_LIMIT_ATTEMPTS) {
      logSecurityEvent('rate_limit_exceeded', {
        attempts: connectionAttemptsRef.current.length,
        window: RATE_LIMIT_WINDOW
      });
      return false;
    }
    
    connectionAttemptsRef.current.push(now);
    return true;
  }, [logSecurityEvent]);

  // Validar pré-requisitos de segurança
  const validatePrerequisites = useCallback((): { valid: boolean; error?: string } => {
    if (!profile?.nome || profile.nome.length < 2) {
      return { valid: false, error: 'Nome deve ter pelo menos 2 caracteres' };
    }
    
    if (!profile?.numero) {
      return { valid: false, error: 'Número de telefone é obrigatório' };
    }
    
    // Validar formato do telefone brasileiro
    const cleanPhone = profile.numero.replace(/\D/g, '');
    if (!/^55[1-9][1-9][0-9]{8,9}$/.test(cleanPhone)) {
      return { valid: false, error: 'Formato de telefone inválido (use 55 + DDD + número)' };
    }
    
    return { valid: true };
  }, [profile]);

  // Função segura para obter sessão
  const getSecureSession = useCallback(async () => {
    try {
      const { data: sessionData, error } = await supabase.auth.getSession();
      
      if (error) {
        logSecurityEvent('session_error', { error: error.message });
        throw new Error('Erro de autenticação: ' + error.message);
      }
      
      if (!sessionData.session) {
        logSecurityEvent('session_missing', {});
        throw new Error('Sessão não encontrada - faça login novamente');
      }
      
      // Verificar se a sessão não está expirada
      const expiresAt = sessionData.session.expires_at;
      if (expiresAt && expiresAt * 1000 < Date.now()) {
        logSecurityEvent('session_expired', { expires_at: expiresAt });
        throw new Error('Sessão expirada - faça login novamente');
      }
      
      return sessionData.session;
    } catch (error) {
      console.error('[SecureWhatsApp] Erro na sessão:', error);
      throw error;
    }
  }, [logSecurityEvent]);

  // Função principal para conectar
  const connect = useCallback(async () => {
    console.log('[SecureWhatsApp] Iniciando conexão segura...');
    
    // Verificar rate limiting
    if (!checkRateLimit()) {
      const error = 'Muitas tentativas de conexão. Aguarde 1 minuto.';
      setConnectionData(prev => ({
        ...prev,
        state: 'ERROR',
        error,
        message: error
      }));
      toast({
        title: "Limite de tentativas excedido",
        description: error,
        variant: 'destructive'
      });
      return;
    }

    // Validar pré-requisitos
    const validation = validatePrerequisites();
    if (!validation.valid) {
      logSecurityEvent('connection_validation_failed', { error: validation.error });
      setConnectionData(prev => ({
        ...prev,
        state: 'ERROR',
        error: validation.error!,
        message: validation.error!
      }));
      toast({
        title: 'Validação falhou',
        description: validation.error,
        variant: 'destructive'
      });
      return;
    }

    setConnectionData(prev => ({
      ...prev,
      state: 'AWAITING_CONNECTION',
      isLoading: true,
      message: 'Iniciando conexão segura...',
      error: null,
      lastConnectionAttempt: Date.now()
    }));

    try {
      logSecurityEvent('whatsapp_connection_started', {
        profile_id: profile?.id,
        has_numero: !!profile?.numero
      });

      const session = await getSecureSession();

      const { data, error } = await supabase.functions.invoke('evolution-api-handler', {
        body: { action: 'connect' },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        console.error('[SecureWhatsApp] Erro da função:', error);
        throw new Error(error.message || 'Erro na função serverless');
      }
      
      if (!data?.success) {
        console.error('[SecureWhatsApp] Função retornou erro:', data?.error);
        throw new Error(data?.error || 'Erro desconhecido na conexão');
      }

      // Conexão bem-sucedida
      setConnectionData(prev => ({
        ...prev,
        state: 'AWAITING_CONNECTION',
        isLoading: false,
        pairingCode: data.pairingCode,
        qrCode: data.qrCode,
        instanceName: data.instanceName,
        message: 'Códigos gerados com sucesso. Use o código de pareamento.'
      }));

      logSecurityEvent('whatsapp_connection_codes_generated', {
        instance_name: data.instanceName,
        has_pairing_code: !!data.pairingCode,
        has_qr_code: !!data.qrCode
      });

      toast({
        title: "Códigos gerados",
        description: "Use o código de pareamento ou QR code para conectar.",
        duration: 5000
      });

    } catch (error: any) {
      console.error('[SecureWhatsApp] Erro na conexão:', error);
      
      logSecurityEvent('whatsapp_connection_failed', {
        error: error.message,
        profile_id: profile?.id
      });
      
      setConnectionData(prev => ({
        ...prev,
        state: 'ERROR',
        isLoading: false,
        error: error.message,
        message: 'Falha na conexão: ' + error.message
      }));
      
      toast({
        title: "Erro na Conexão",
        description: error.message || 'Ocorreu um erro inesperado.',
        variant: 'destructive'
      });
    }
  }, [profile, checkRateLimit, validatePrerequisites, getSecureSession, logSecurityEvent, toast]);

  // Função para desconectar
  const disconnect = useCallback(async () => {
    if (!profile?.instance_name) {
      toast({
        title: 'Nenhuma conexão encontrada',
        description: 'Não há instância para desconectar.',
        variant: 'destructive'
      });
      return;
    }

    setConnectionData(prev => ({
      ...prev,
      isLoading: true,
      message: 'Desconectando...'
    }));

    try {
      logSecurityEvent('whatsapp_disconnection_started', {
        instance_name: profile.instance_name
      });

      const session = await getSecureSession();

      const { data, error } = await supabase.functions.invoke('evolution-api-handler', {
        body: { action: 'delete' },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Erro ao desconectar');

      setConnectionData({
        state: 'NO_CONNECTION',
        isLoading: false,
        pairingCode: null,
        qrCode: null,
        instanceName: null,
        message: 'WhatsApp desconectado com sucesso',
        error: null,
        lastConnectionAttempt: null
      });

      await refreshProfile();

      logSecurityEvent('whatsapp_disconnected', {
        instance_name: profile.instance_name
      });

      toast({
        title: "Desconectado",
        description: "WhatsApp desconectado com sucesso.",
        duration: 3000
      });

    } catch (error: any) {
      console.error('[SecureWhatsApp] Erro ao desconectar:', error);
      
      logSecurityEvent('whatsapp_disconnection_failed', {
        error: error.message,
        instance_name: profile?.instance_name
      });
      
      setConnectionData(prev => ({
        ...prev,
        state: 'ERROR',
        isLoading: false,
        error: error.message,
        message: 'Erro ao desconectar: ' + error.message
      }));
      
      toast({
        title: "Erro ao Desconectar",
        description: error.message || 'Ocorreu um erro.',
        variant: 'destructive'
      });
    }
  }, [profile, getSecureSession, refreshProfile, logSecurityEvent, toast]);

  // Reset para estado inicial
  const reset = useCallback(() => {
    setConnectionData({
      state: 'NO_CONNECTION',
      isLoading: false,
      pairingCode: null,
      qrCode: null,
      instanceName: null,
      message: 'Configure seu WhatsApp para começar',
      error: null,
      lastConnectionAttempt: null
    });
    
    logSecurityEvent('whatsapp_connection_reset', {});
  }, [logSecurityEvent]);

  // Cleanup
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  return {
    connectionData,
    connect,
    disconnect,
    reset,
    canConnect: validatePrerequisites().valid
  };
};
