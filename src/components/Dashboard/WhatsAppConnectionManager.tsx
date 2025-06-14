import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useProfile } from '@/hooks/useProfile';
import { useNavigate } from 'react-router-dom';
import { 
  initializeConnection, 
  getQRCode, 
  disconnectWhatsApp, 
  checkConnectionStatus,
  type ConnectionState,
  type ConnectionResult 
} from '@/services/whatsappService';
import { 
  MessageSquare, 
  Loader2, 
  Wifi, 
  WifiOff, 
  QrCode, 
  Phone,
  CheckCircle,
  AlertCircle,
  Unlink,
  Settings 
} from 'lucide-react';

// Estados visuais do componente
interface ComponentState {
  connectionState: ConnectionState;
  isLoading: boolean;
  qrCode: string | null;
  instanceName: string | null;
  message: string;
  isPolling: boolean;
  hasInitialized: boolean; // Nova flag para controlar inicialização
}

export const WhatsAppConnectionManager: React.FC = () => {
  const { toast } = useToast();
  const { profile, refreshProfile } = useProfile();
  const navigate = useNavigate();
  
  const [state, setState] = useState<ComponentState>({
    connectionState: 'needs_phone_number',
    isLoading: false,
    qrCode: null,
    instanceName: null,
    message: 'Carregando...',
    isPolling: false,
    hasInitialized: false
  });

  // Timer para restart do QR Code
  const [qrTimer, setQrTimer] = useState<NodeJS.Timeout | null>(null);

  // Inicializar conexão automaticamente ao carregar APENAS UMA VEZ
  useEffect(() => {
    if (!state.hasInitialized) {
      console.log('[WhatsApp Manager] Inicializando pela primeira vez...');
      initializeConnectionFlow();
    }
  }, [state.hasInitialized]);

  // Polling para verificar conexão quando necessário
  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    if (state.isPolling && state.instanceName && state.connectionState === 'needs_qr_code') {
      console.log('[WhatsApp Manager] Iniciando polling para:', state.instanceName);
      intervalId = setInterval(async () => {
        try {
          const status = await checkConnectionStatus(state.instanceName!);
          console.log('[WhatsApp Manager] Status do polling:', status);
          
          if (status === 'open') {
            console.log('[WhatsApp Manager] Conexão detectada! Parando polling.');
            setState(prev => ({ 
              ...prev, 
              connectionState: 'already_connected',
              isPolling: false,
              qrCode: null,
              message: 'WhatsApp conectado com sucesso!'
            }));
            
            // Limpar timer se existe
            if (qrTimer) {
              clearTimeout(qrTimer);
              setQrTimer(null);
            }
            
            await refreshProfile();
            
            toast({
              title: "Conectado!",
              description: "WhatsApp conectado com sucesso",
            });
          }
        } catch (error) {
          console.error('[WhatsApp Manager] Erro no polling:', error);
        }
      }, 4000);
    }

    return () => {
      if (intervalId) {
        console.log('[WhatsApp Manager] Limpando interval do polling');
        clearInterval(intervalId);
      }
    };
  }, [state.isPolling, state.instanceName, state.connectionState, refreshProfile, toast, qrTimer]);

  // Limpar timer ao desmontar
  useEffect(() => {
    return () => {
      if (qrTimer) {
        console.log('[WhatsApp Manager] Limpando timer de QR Code');
        clearTimeout(qrTimer);
      }
    };
  }, [qrTimer]);

  // Função principal: inicializar conexão
  const initializeConnectionFlow = async () => {
    console.log('[WhatsApp Manager] Iniciando fluxo de inicialização...');
    setState(prev => ({ 
      ...prev, 
      isLoading: true, 
      message: 'Verificando estado da conexão...',
      hasInitialized: true 
    }));
    
    try {
      const result = await initializeConnection();
      console.log('[WhatsApp Manager] Resultado da inicialização:', result);
      
      if (result.success) {
        setState(prev => ({
          ...prev,
          connectionState: result.state,
          instanceName: result.instanceName || null,
          message: result.message || getStateMessage(result.state),
          isLoading: false
        }));

        // Se precisa de QR Code, buscar automaticamente
        if (result.state === 'needs_qr_code' && result.instanceName) {
          console.log('[WhatsApp Manager] Estado requer QR Code, gerando...');
          await handleGetQRCode(result.instanceName);
        }
      } else {
        console.error('[WhatsApp Manager] Erro na inicialização:', result.error);
        setState(prev => ({
          ...prev,
          connectionState: 'error',
          message: result.error || 'Erro ao inicializar conexão',
          isLoading: false
        }));
      }
    } catch (error) {
      console.error('[WhatsApp Manager] Erro inesperado na inicialização:', error);
      setState(prev => ({
        ...prev,
        connectionState: 'error',
        message: 'Erro inesperado ao inicializar conexão',
        isLoading: false
      }));
    }
  };

  // Obter QR Code com timer de restart
  const handleGetQRCode = async (instanceName: string) => {
    console.log('[WhatsApp Manager] Gerando QR Code para:', instanceName);
    setState(prev => ({ ...prev, isLoading: true, message: 'Gerando QR Code...' }));
    
    try {
      const result = await getQRCode(instanceName);
      console.log('[WhatsApp Manager] Resultado do QR Code:', result.success ? 'Sucesso' : result.error);
      
      if (result.success && result.qrCode) {
        setState(prev => ({
          ...prev,
          qrCode: result.qrCode!,
          isLoading: false,
          isPolling: true,
          message: 'Escaneie o QR Code com seu WhatsApp'
        }));

        // Iniciar timer de 30 segundos para restart
        const timer = setTimeout(async () => {
          console.log('[WhatsApp Manager] Timer de 30s atingido, verificando se ainda está conectando...');
          
          // Verificar se ainda está no estado de conectando
          if (state.connectionState === 'needs_qr_code') {
            console.log('[WhatsApp Manager] Ainda conectando, fazendo restart da instância...');
            
            try {
              // Chamar endpoint de restart
              const restartResponse = await fetch('/api/supabase/functions/evolution-restart-instance', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${(await import('@/integrations/supabase/client')).supabase.auth.getSession().then(s => s.data.session?.access_token)}`,
                },
                body: JSON.stringify({ instanceName })
              });

              if (restartResponse.ok) {
                console.log('[WhatsApp Manager] Restart realizado com sucesso, gerando novo QR Code...');
                
                // Aguardar um pouco e gerar novo QR Code
                setTimeout(() => {
                  handleGetQRCode(instanceName);
                }, 2000);
              } else {
                console.error('[WhatsApp Manager] Erro no restart:', restartResponse.status);
              }
            } catch (error) {
              console.error('[WhatsApp Manager] Erro ao fazer restart:', error);
            }
          }
        }, 30000); // 30 segundos

        setQrTimer(timer);
      } else {
        // Se a instância já estiver conectada, o serviço retornará `state: 'already_connected'`
        if (result.state === 'already_connected') {
          setState(prev => ({
            ...prev,
            connectionState: 'already_connected',
            isPolling: false,
            qrCode: null,
            message: 'WhatsApp já está conectado!',
            isLoading: false
          }));
          await refreshProfile();
          toast({
            title: "Já Conectado",
            description: result.error || "Seu WhatsApp já está conectado.",
          });
        } else {
          setState(prev => ({
            ...prev,
            connectionState: 'error',
            message: result.error || 'Erro ao gerar QR Code',
            isLoading: false
          }));
        }
      }
    } catch (error) {
      console.error('[WhatsApp Manager] Erro inesperado ao gerar QR Code:', error);
      setState(prev => ({
        ...prev,
        connectionState: 'error',
        message: 'Erro inesperado ao gerar QR Code',
        isLoading: false
      }));
    }
  };

  // Desconectar WhatsApp
  const handleDisconnect = async () => {
    console.log('[WhatsApp Manager] Iniciando desconexão...');
    setState(prev => ({ ...prev, isLoading: true, message: 'Desconectando...' }));
    
    try {
      const result = await disconnectWhatsApp();
      console.log('[WhatsApp Manager] Resultado da desconexão:', result);
      
      if (result.success) {
        setState({
          connectionState: 'needs_phone_number',
          isLoading: false,
          qrCode: null,
          instanceName: null,
          message: result.message || 'WhatsApp desconectado com sucesso',
          isPolling: false,
          hasInitialized: true // Manter como inicializado
        });
        
        await refreshProfile();
        
        toast({
          title: "Desconectado",
          description: "WhatsApp desconectado com sucesso",
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
      console.error('[WhatsApp Manager] Erro inesperado ao desconectar:', error);
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
  };

  // Obter mensagem padrão para cada estado
  const getStateMessage = (connectionState: ConnectionState): string => {
    switch (connectionState) {
      case 'needs_phone_number':
        return 'Configure seu número de telefone nas configurações';
      case 'needs_qr_code':
        return 'Clique em "Conectar WhatsApp" para gerar o QR Code';
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

  // Renderizar badge de status
  const renderStatusBadge = () => {
    switch (state.connectionState) {
      case 'already_connected':
        return (
          <Badge className="bg-green-100 text-green-800 border-green-200">
            <CheckCircle className="w-3 h-3 mr-1" />
            Conectado
          </Badge>
        );
      case 'is_connecting':
      case 'needs_qr_code':
        return (
          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
            {state.connectionState === 'is_connecting' ? 'Conectando' : 'Aguardando'}
          </Badge>
        );
      case 'error':
        return (
          <Badge className="bg-red-100 text-red-800 border-red-200">
            <AlertCircle className="w-3 h-3 mr-1" />
            Erro
          </Badge>
        );
      default:
        return (
          <Badge className="bg-gray-100 text-gray-800 border-gray-200">
            <WifiOff className="w-3 h-3 mr-1" />
            Desconectado
          </Badge>
        );
    }
  };

  // Renderizar botões de ação
  const renderActionButtons = () => {
    if (state.isLoading) {
      return (
        <Button disabled size="sm">
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          Processando...
        </Button>
      );
    }

    switch (state.connectionState) {
      case 'needs_phone_number':
        return (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => navigate('/settings')}
          >
            <Settings className="w-4 h-4 mr-2" />
            Configurar Telefone
          </Button>
        );

      case 'needs_qr_code':
        if (!state.qrCode) {
          return (
            <Button onClick={() => state.instanceName && handleGetQRCode(state.instanceName)} size="sm">
              <QrCode className="w-4 h-4 mr-2" />
              Conectar WhatsApp
            </Button>
          );
        }
        return null;

      case 'already_connected':
        return (
          <Button onClick={handleDisconnect} variant="destructive" size="sm">
            <Unlink className="w-4 h-4 mr-2" />
            Desconectar
          </Button>
        );

      case 'error':
        return (
          <Button onClick={initializeConnectionFlow} variant="outline" size="sm">
            Tentar Novamente
          </Button>
        );

      default:
        return null;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <MessageSquare className="w-5 h-5 text-green-600" />
          <span>Conexão WhatsApp</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status da Conexão */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium">Status:</span>
            {renderStatusBadge()}
          </div>
          
          {state.isPolling && (
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Monitorando...</span>
            </div>
          )}
        </div>

        {/* Mensagem de Status */}
        <p className="text-sm text-muted-foreground">{state.message}</p>

        {/* Número de Telefone (se conectado) */}
        {state.connectionState === 'already_connected' && profile?.numero && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <Phone className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-green-800">
                Telefone: ({profile.numero.slice(2, 4)}) {profile.numero.length === 13 ? profile.numero.slice(4, 5) + ' ' : ''}{profile.numero.slice(-8)}
              </span>
            </div>
          </div>
        )}

        {/* Botões de Ação */}
        <div className="flex space-x-2">
          {renderActionButtons()}
        </div>

        {/* QR Code */}
        {state.qrCode && state.connectionState === 'needs_qr_code' && (
          <Card>
            <CardContent className="p-4">
              <div className="text-center space-y-3">
                <h3 className="font-medium">Escaneie o QR Code</h3>
                <p className="text-sm text-muted-foreground">
                  Abra o WhatsApp → Menu → Dispositivos conectados → Conectar dispositivo
                </p>
                <div className="flex justify-center">
                  <img
                    src={state.qrCode}
                    alt="QR Code para conectar WhatsApp"
                    className="max-w-[200px] max-h-[200px] border rounded-lg"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  O QR Code expira em 30 segundos
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  );
};
