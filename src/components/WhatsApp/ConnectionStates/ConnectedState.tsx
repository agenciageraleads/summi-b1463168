
// ABOUTME: Componente para estado conectado - exibe informações da conexão ativa
// ABOUTME: Interface limpa similar ao estilo "ziptalk" solicitado
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle, Settings, Phone } from 'lucide-react';

interface ConnectedStateProps {
  instanceName: string | null;
  phoneNumber: string | null;
  message: string;
  onDisconnect: () => void;
  onPreferences: () => void;
  isLoading: boolean;
}

export const ConnectedState = ({
  instanceName,
  phoneNumber,
  message,
  onDisconnect,
  onPreferences,
  isLoading
}: ConnectedStateProps) => {
  return (
    <Card className="card-hover border-2 border-green-200">
      <CardContent className="p-6">
        {/* Status Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">WhatsApp Conectado</h3>
              <p className="text-sm text-green-600">Ativo</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-xs text-muted-foreground">Online</span>
          </div>
        </div>

        {/* Connection Info */}
        <div className="space-y-3 mb-6">
          {phoneNumber && (
            <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
              <Phone className="w-4 h-4 text-gray-500" />
              <div>
                <p className="text-sm font-medium text-foreground">Número</p>
                <p className="text-sm text-muted-foreground">
                  +{phoneNumber.replace(/(\d{2})(\d{2})(\d{5})(\d{4})/, '$1 ($2) $3-$4')}
                </p>
              </div>
            </div>
          )}

          {instanceName && (
            <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-muted-foreground">
                Instância: {instanceName}
              </span>
            </div>
          )}
        </div>

        <p className="text-sm text-muted-foreground mb-6 text-center">
          {message}
        </p>

        {/* Action Buttons */}
        <div className="flex space-x-3">
          <Button
            onClick={onPreferences}
            variant="outline"
            className="flex-1"
          >
            <Settings className="w-4 h-4 mr-2" />
            Preferências
          </Button>
          
          <Button
            onClick={onDisconnect}
            disabled={isLoading}
            variant="destructive"
            className="flex-1"
          >
            {isLoading ? 'Desconectando...' : 'Desconectar'}
          </Button>
        </div>

        {/* Feature Status */}
        <div className="mt-6 pt-4 border-t">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="w-2 h-2 bg-green-500 rounded-full mx-auto mb-1"></div>
              <span className="text-xs text-muted-foreground">Webhook</span>
            </div>
            <div>
              <div className="w-2 h-2 bg-green-500 rounded-full mx-auto mb-1"></div>
              <span className="text-xs text-muted-foreground">Mensagens</span>
            </div>
            <div>
              <div className="w-2 h-2 bg-green-500 rounded-full mx-auto mb-1"></div>
              <span className="text-xs text-muted-foreground">Grupos</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
