
// Componente simplificado que usa apenas o hook principal - VERSÃO CORRIGIDA
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useProfile } from '@/hooks/useProfile';
import { useNavigate } from 'react-router-dom';
import { useWhatsAppManager } from '@/hooks/useWhatsAppManager';
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

export const WhatsAppConnectionManager: React.FC = () => {
  const { profile } = useProfile();
  const navigate = useNavigate();
  const { state, handleConnect, handleDisconnect } = useWhatsAppManager();

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
    // Se está carregando, mostrar botão desabilitado
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
        return (
          <Button onClick={handleConnect} size="sm">
            <QrCode className="w-4 h-4 mr-2" />
            Conectar WhatsApp
          </Button>
        );

      case 'already_connected':
        return (
          <Button onClick={handleDisconnect} variant="destructive" size="sm">
            <Unlink className="w-4 h-4 mr-2" />
            Desconectar
          </Button>
        );

      case 'error':
        return (
          <Button onClick={handleConnect} variant="outline" size="sm">
            Tentar Novamente
          </Button>
        );

      default:
        return (
          <Button onClick={handleConnect} size="sm">
            <QrCode className="w-4 h-4 mr-2" />
            Conectar WhatsApp
          </Button>
        );
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
