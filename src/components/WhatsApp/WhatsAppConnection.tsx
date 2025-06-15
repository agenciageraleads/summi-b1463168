
import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useWhatsAppManager } from '@/hooks/useWhatsAppManager';
import { Loader2, Wifi, WifiOff, QrCode } from 'lucide-react';

export const WhatsAppConnection = () => {
  const { state, handleConnect, handleDisconnect } = useWhatsAppManager();

  // Função para renderizar o status com cor apropriada
  const renderStatus = () => {
    switch (state.connectionState) {
      case 'already_connected':
        return (
          <Badge className="bg-green-100 text-green-800 border-green-200">
            <Wifi className="w-3 h-3 mr-1" />
            Conectado
          </Badge>
        );
      case 'is_connecting':
      case 'needs_qr_code':
        return (
          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
            Conectando...
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

  return (
    <div className="space-y-4">
      {/* Status da Conexão */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium">Status:</span>
          {renderStatus()}
        </div>
        
        {state.isPolling && (
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Aguardando conexão...</span>
          </div>
        )}
      </div>

      {/* Botões de Ação */}
      <div className="flex space-x-2">
        {state.connectionState === 'already_connected' ? (
          <Button
            onClick={handleDisconnect}
            disabled={state.isLoading}
            variant="destructive"
            size="sm"
          >
            {state.isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Desconectando...
              </>
            ) : (
              <>
                <WifiOff className="w-4 h-4 mr-2" />
                Desconectar
              </>
            )}
          </Button>
        ) : (
          <Button
            onClick={handleConnect}
            disabled={state.isLoading || state.isPolling}
            size="sm"
          >
            {state.isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Conectando...
              </>
            ) : (
              <>
                <QrCode className="w-4 h-4 mr-2" />
                Conectar WhatsApp
              </>
            )}
          </Button>
        )}
      </div>

      {/* QR Code */}
      {state.qrCode && (
        <Card>
          <CardContent className="p-4">
            <div className="text-center space-y-3">
              <h3 className="font-medium">Escaneie o QR Code</h3>
              <p className="text-sm text-muted-foreground">
                Abra o WhatsApp, toque em Menu → Dispositivos conectados → Conectar dispositivo
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
    </div>
  );
};
