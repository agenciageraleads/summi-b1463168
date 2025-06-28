
// ABOUTME: Componente para estado de aguardando conexão - exibe pairing code e QR
// ABOUTME: Inclui botões para copiar código e gerar novo código
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Copy, RefreshCw, QrCode } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AwaitingConnectionStateProps {
  pairingCode: string | null;
  qrCode: string | null;
  message: string;
  isLoading: boolean;
  onGenerateNewCode: () => void;
}

export const AwaitingConnectionState = ({
  pairingCode,
  qrCode,
  message,
  isLoading,
  onGenerateNewCode
}: AwaitingConnectionStateProps) => {
  const { toast } = useToast();
  const [showQrCode, setShowQrCode] = useState(false);

  const copyPairingCode = async () => {
    if (!pairingCode) return;
    
    try {
      await navigator.clipboard.writeText(pairingCode);
      toast({
        title: "Código copiado!",
        description: "Cole no WhatsApp para conectar",
        duration: 3000
      });
    } catch {
      toast({
        title: "Erro ao copiar",
        description: "Copie manualmente o código",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* Pairing Code Card - Principal */}
      <Card className="card-hover border-2 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-blue-700">
            <span>📱</span>
            <span>Código de Pareamento</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {message}
          </p>

          {pairingCode && (
            <div className="text-center space-y-4">
              <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-4">
                <div className="text-2xl font-mono font-bold text-gray-800 tracking-wider">
                  {pairingCode}
                </div>
              </div>

              <div className="flex space-x-2 justify-center">
                <Button
                  onClick={copyPairingCode}
                  variant="outline"
                  size="sm"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copiar Código
                </Button>

                <Button
                  onClick={onGenerateNewCode}
                  disabled={isLoading}
                  variant="outline"
                  size="sm"
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                  Novo Código
                </Button>
              </div>
            </div>
          )}

          {/* Instruções */}
          <div className="text-xs text-muted-foreground bg-blue-50 p-3 rounded-lg">
            <p className="font-medium mb-1">Como usar:</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Abra o WhatsApp no seu celular</li>
              <li>Vá em Configurações → Aparelhos conectados</li>
              <li>Toque em "Conectar um aparelho"</li>
              <li>Digite o código acima quando solicitado</li>
            </ol>
          </div>
        </CardContent>
      </Card>

      {/* QR Code Card - Fallback */}
      {qrCode && (
        <Card className="card-hover">
          <CardContent className="p-4">
            <Button
              onClick={() => setShowQrCode(!showQrCode)}
              variant="ghost"
              className="w-full flex items-center justify-center space-x-2"
            >
              <QrCode className="w-4 h-4" />
              <span>
                {showQrCode ? 'Ocultar QR Code' : 'Usar QR Code (alternativa)'}
              </span>
            </Button>

            {showQrCode && (
              <div className="mt-4 text-center">
                <div className="w-64 h-64 bg-white border-2 border-border rounded-lg flex items-center justify-center mx-auto">
                  <img 
                    src={qrCode} 
                    alt="QR Code" 
                    className="w-56 h-56 object-contain"
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Escaneie com a câmera do WhatsApp
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
