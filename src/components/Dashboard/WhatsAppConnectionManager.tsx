
// ABOUTME: Componente principal para gerenciar conexão WhatsApp com suporte a QR Code e Pairing Code
// ABOUTME: Interface unificada com toggle entre métodos de conexão e feedback visual completo

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
  Copy
} from 'lucide-react';

export const WhatsAppConnectionManager: React.FC = () => {
  const { profile, refreshProfile } = useProfile();
  const navigate = useNavigate();
  const { state, handleConnect, handleDisconnect, switchConnectionMethod } = useWhatsAppManager();
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
      await handleConnect(state.connectionMethod);

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
      case 'needs_qr_code':
      case 'needs_pairing_code':
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

  // Renderizar toggle de método de conexão
  const renderConnectionMethodToggle = () => {
    if (state.connectionState === 'already_connected' || state.isLoading) {
      return null;
    }

    return (
      <div className="flex space-x-2 mb-4">
        <Button
          variant={state.connectionMethod === 'qr-code' ? 'default' : 'outline'}
          size="sm"
          onClick={() => switchConnectionMethod('qr-code')}
          disabled={state.isLoading}
        >
          <QrCode className="w-4 h-4 mr-2" />
          QR Code
        </Button>
        <Button
          variant={state.connectionMethod === 'pairing-code' ? 'default' : 'outline'}
          size="sm"
          onClick={() => switchConnectionMethod('pairing-code')}
          disabled={state.isLoading}
        >
          <Smartphone className="w-4 h-4 mr-2" />
          Pairing Code
        </Button>
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
      case 'needs_qr_code':
      case 'needs_pairing_code':
        return (
          <div className="flex space-x-2">
            <Button onClick={() => handleConnect(state.connectionMethod)} size="sm">
              {state.connectionMethod === 'qr-code' ? (
                <>
                  <QrCode className="w-4 h-4 mr-2" />
                  Conectar WhatsApp
                </>
              ) : (
                <>
                  <Smartphone className="w-4 h-4 mr-2" />
                  Gerar Código
                </>
              )}
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
            <Button onClick={() => handleConnect(state.connectionMethod)} variant="outline" size="sm">
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
          <Button onClick={() => handleConnect(state.connectionMethod)} size="sm">
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

        {/* Toggle de Método de Conexão */}
        <div className="flex justify-center">
          {renderConnectionMethodToggle()}
        </div>

        {/* Botões de Ação */}
        <div className="flex justify-center">
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
                  O QR Code expira em aproximadamente 45 segundos
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Pairing Code */}
        {state.pairingCode && state.connectionState === 'needs_pairing_code' && (
          <Card>
            <CardContent className="p-4">
              <div className="text-center space-y-3">
                <h3 className="font-medium">Digite o Pairing Code</h3>
                <p className="text-sm text-muted-foreground">
                  Abra o WhatsApp → Configurações → Dispositivos conectados → Conectar dispositivo → Conectar com número de telefone
                </p>
                <div className="flex justify-center items-center space-x-2">
                  <div className="text-2xl font-mono font-bold bg-gray-100 px-4 py-2 rounded-lg border">
                    {state.pairingCode}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={copyPairingCode}
                    title="Copiar código"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  O Pairing Code expira em aproximadamente 45 segundos
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  );
};
