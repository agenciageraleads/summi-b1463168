
// ABOUTME: Componente principal para gerenciar conexão WhatsApp com apresentação dupla de QR Code e Pairing Code
// ABOUTME: Interface unificada que exibe ambos os métodos simultaneamente com contador regressivo

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useProfile } from '@/hooks/useProfile';
import { useNavigate } from 'react-router-dom';
import { useWhatsAppManager } from '@/hooks/useWhatsAppManager';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  MessageSquare, 
  Loader2, 
  CheckCircle, 
  AlertCircle, 
  QrCode, 
  Phone, 
  Settings, 
  RefreshCw,
  Smartphone,
  Copy,
  Clock,
  AlertTriangle
} from 'lucide-react';

export const WhatsAppConnectionManager: React.FC = () => {
  const { profile, refreshProfile } = useProfile();
  const navigate = useNavigate();
  const { state, handleConnect, handleDisconnect, forceRenewCodes } = useWhatsAppManager();
  const { toast } = useToast();
  const [isRecreating, setIsRecreating] = React.useState(false);

  // Função para copiar pairing code
  const copyPairingCode = async () => {
    if (state.pairingCode) {
      try {
        await navigator.clipboard.writeText(state.pairingCode);
        toast({
          title: "Copiado!",
          description: "Pairing Code copiado para a área de transferência",
          duration: 2000
        });
      } catch (error) {
        console.error('Erro ao copiar:', error);
        toast({
          title: "Erro",
          description: "Não foi possível copiar o código",
          variant: "destructive"
        });
      }
    }
  };

  // Função para recriar instância
  const handleRecreateInstance = async () => {
    if (!profile?.instance_name) {
      toast({
        title: "Erro",
        description: "Nenhuma instância encontrada para recriar",
        variant: "destructive"
      });
      return;
    }

    setIsRecreating(true);
    
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        throw new Error('Usuário não autenticado');
      }

      const { data: deleteData, error: deleteError } = await supabase.functions.invoke('evolution-api-handler', {
        body: { 
          action: 'delete',
          instanceName: profile.instance_name 
        },
        headers: {
          Authorization: `Bearer ${sessionData.session.access_token}`,
        },
      });

      if (deleteError) {
        throw new Error('Erro ao deletar instância atual');
      }

      await new Promise(resolve => setTimeout(resolve, 2000));
      await refreshProfile();
      await handleConnect();

      toast({
        title: "Instância Recriada",
        description: "A instância foi recriada com sucesso.",
        duration: 5000
      });

    } catch (error: any) {
      console.error('[WhatsApp Manager] Erro ao recriar instância:', error);
      toast({
        title: "Erro ao Recriar Instância",
        description: error.message || 'Erro inesperado ao recriar instância',
        variant: "destructive"
      });
    } finally {
      setIsRecreating(false);
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
      case 'needs_connection':
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
            <AlertCircle className="w-3 h-3 mr-1" />
            Desconectado
          </Badge>
        );
    }
  };

  // FASE 3: Renderizar contador regressivo
  const renderCountdown = () => {
    if (state.connectionState !== 'is_connecting' || (!state.qrCode && !state.pairingCode)) {
      return null;
    }

    const minutes = Math.floor(state.countdownSeconds / 60);
    const seconds = state.countdownSeconds % 60;
    const isWarning = state.countdownSeconds <= 10;

    return (
      <div className={`flex items-center justify-center space-x-2 p-3 rounded-lg transition-colors ${
        isWarning ? 'bg-red-50 border border-red-200' : 'bg-blue-50 border border-blue-200'
      }`}>
        <Clock className={`w-4 h-4 ${isWarning ? 'text-red-600' : 'text-blue-600'}`} />
        <span className={`text-sm font-medium ${isWarning ? 'text-red-800' : 'text-blue-800'}`}>
          Códigos renovam em: {minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}
        </span>
        {isWarning && (
          <Button
            variant="outline"
            size="sm"
            onClick={forceRenewCodes}
            className="text-xs px-2 py-1 h-6"
          >
            Renovar agora
          </Button>
        )}
      </div>
    );
  };

  // Renderizar alerta de erro
  const renderErrorAlert = () => {
    if (!state.hasConnectionError || state.errorCount === 0) return null;

    return (
      <div className="flex items-center space-x-2 p-3 bg-orange-50 border border-orange-200 rounded-lg">
        <AlertTriangle className="w-4 h-4 text-orange-600" />
        <div className="flex-1">
          <p className="text-sm text-orange-800 font-medium">
            {state.errorCount >= 5 
              ? `Muitos erros detectados (${state.errorCount}). Considere recriar a instância.`
              : `Erro detectado (tentativa ${state.errorCount}/5). Tentando novamente...`
            }
          </p>
        </div>
        {state.errorCount >= 3 && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleRecreateInstance}
            className="text-xs"
          >
            Recriar
          </Button>
        )}
      </div>
    );
  };

  // Renderizar botões de ação
  const renderActionButtons = () => {
    if (state.isLoading || isRecreating) {
      return (
        <Button disabled size="sm">
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          {isRecreating ? 'Recriando...' : 'Processando...'}
        </Button>
      );
    }

    switch (state.connectionState) {
      case 'needs_phone_number':
        return (
          <Button variant="outline" size="sm" onClick={() => navigate('/settings')}>
            <Settings className="w-4 h-4 mr-2" />
            Configurar Telefone
          </Button>
        );
      case 'needs_connection':
        return (
          <div className="flex space-x-2">
            <Button onClick={() => handleConnect()} size="sm">
              <Smartphone className="w-4 h-4 mr-2" />
              Conectar WhatsApp
            </Button>
            {profile?.instance_name && (
              <Button 
                onClick={handleRecreateInstance} 
                variant="outline" 
                size="sm"
                title="Recriar instância"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Recriar
              </Button>
            )}
          </div>
        );
      case 'already_connected':
        return (
          <Button onClick={handleDisconnect} variant="destructive" size="sm">
            <AlertCircle className="w-4 h-4 mr-2" />
            Desconectar
          </Button>
        );
      case 'error':
        return (
          <div className="flex space-x-2">
            <Button onClick={() => handleConnect()} variant="outline" size="sm">
              Tentar Novamente
            </Button>
            {profile?.instance_name && (
              <Button 
                onClick={handleRecreateInstance} 
                variant="outline" 
                size="sm"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Recriar
              </Button>
            )}
          </div>
        );
      default:
        return (
          <Button onClick={() => handleConnect()} size="sm">
            <QrCode className="w-4 h-4 mr-2" />
            Conectar WhatsApp
          </Button>
        );
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-center space-x-2">
          <MessageSquare className="w-5 h-5 text-green-600" />
          <span>Conexão WhatsApp</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status da Conexão */}
        <div className="flex flex-col items-center space-y-3">
          <div className="flex items-center space-x-2">
            {renderStatusBadge()}
          </div>
          
          {state.isPolling && (
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Monitorando...</span>
            </div>
          )}
        </div>

        {/* FASE 5: Alerta de Erro */}
        {renderErrorAlert()}

        {/* FASE 3: Contador Regressivo */}
        {renderCountdown()}

        {/* Mensagem de Status */}
        <p className="text-sm text-muted-foreground text-center">{state.message}</p>

        {/* Número de Telefone (se conectado) */}
        {state.connectionState === 'already_connected' && profile?.numero && (
          <div className="flex justify-center">
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <Phone className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-green-800">
                  Telefone: ({profile.numero.slice(2, 4)}) {profile.numero.length === 13 ? profile.numero.slice(4, 5) + ' ' : ''}{profile.numero.slice(-8)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Botões de Ação */}
        <div className="flex justify-center">
          {renderActionButtons()}
        </div>

        {/* FASE 4: CÓDIGOS SIMULTÂNEOS - Layout em grid */}
        {(state.qrCode || state.pairingCode) && state.connectionState === 'is_connecting' && (
          <div className="grid gap-4">
            {/* Pairing Code - Continua em destaque */}
            {state.pairingCode && (
              <Card className="border-green-200 bg-green-50">
                <CardContent className="p-4">
                  <div className="text-center space-y-3">
                    <div className="flex items-center justify-center space-x-2">
                      <Smartphone className="w-5 h-5 text-green-600" />
                      <h3 className="font-semibold text-green-800">Pairing Code (Recomendado)</h3>
                    </div>
                    <div className="p-3 bg-white border border-green-300 rounded-lg">
                      <p className="text-xs text-gray-700 mb-2 font-medium">
                        📱 WhatsApp → Configurações → Dispositivos conectados → Conectar com número
                      </p>
                      <div className="flex justify-center items-center space-x-3">
                        <div className="text-2xl font-mono font-bold bg-gray-100 px-4 py-2 rounded-lg border-2 border-green-400 text-green-800">
                          {state.pairingCode}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={copyPairingCode}
                          className="bg-green-100 border-green-300 hover:bg-green-200"
                          title="Copiar código"
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* QR Code - Exibido simultaneamente */}
            {state.qrCode && (
              <Card className="border-blue-200 bg-blue-50">
                <CardContent className="p-4">
                  <div className="text-center space-y-3">
                    <div className="flex items-center justify-center space-x-2">
                      <QrCode className="w-5 h-5 text-blue-600" />
                      <h3 className="font-medium text-blue-800">QR Code (Alternativo)</h3>
                    </div>
                    <p className="text-xs text-blue-700">
                      WhatsApp → Menu → Dispositivos conectados → Conectar dispositivo
                    </p>
                    <div className="flex justify-center">
                      <img 
                        src={state.qrCode} 
                        alt="QR Code para conectar WhatsApp" 
                        className="max-w-[160px] max-h-[160px] border rounded-lg bg-white p-2" 
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Informação sobre expiração e renovação */}
        {(state.qrCode || state.pairingCode) && state.connectionState === 'is_connecting' && (
          <div className="text-center space-y-1">
            <p className="text-xs text-muted-foreground">
              ⏰ Os códigos são renovados automaticamente a cada 60 segundos
            </p>
            <p className="text-xs text-muted-foreground">
              💡 Use qualquer um dos métodos - ambos funcionam perfeitamente
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
