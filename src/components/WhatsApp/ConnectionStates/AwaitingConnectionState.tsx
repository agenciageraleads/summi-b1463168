
// ABOUTME: Componente para estado de aguardando conexão - exibe pairing code e QR
// ABOUTME: Inclui botões para copiar código e gerar novo código
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Copy, RefreshCw, QrCode, CheckCircle } from 'lucide-react';
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
  const [copied, setCopied] = useState(false);

  const copyPairingCode = async () => {
    if (!pairingCode) return;
    
    try {
      await navigator.clipboard.writeText(pairingCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      
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

  console.log('[AwaitingConnection] Props recebidas:', {
    pairingCode: pairingCode ? `${pairingCode.substring(0, 4)}****` : 'null',
    hasQrCode: !!qrCode,
    isLoading,
    message
  });

  return (
    <div className="space-y-4">
      {/* Pairing Code Card - Design mais sutil inspirado no Ziptalk */}
      <Card className="border border-gray-200 bg-white">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-medium text-gray-900">
            Sincronizar WhatsApp
          </CardTitle>
          <p className="text-sm text-gray-600">
            Sincronize seu dispositivo para usar as funcionalidades
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {pairingCode ? (
            <>
              {/* Instruções passo a passo */}
              <div className="space-y-3 text-sm text-gray-700">
                <div className="flex items-start space-x-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center text-xs font-medium">1</span>
                  <span>Abra o WhatsApp no seu celular</span>
                </div>
                <div className="flex items-start space-x-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center text-xs font-medium">2</span>
                  <span>Clique em <strong>⚙️</strong> ou <strong>Configurações</strong> e selecione <strong>Dispositivos conectados</strong></span>
                </div>
                <div className="flex items-start space-x-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center text-xs font-medium">3</span>
                  <span>Clique em <strong>Linkar um dispositivo</strong></span>
                </div>
                <div className="flex items-start space-x-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center text-xs font-medium">4</span>
                  <span>Clique em <strong>Linkar usando código de acesso</strong> e digite esse código no seu celular para finalizar.</span>
                </div>
              </div>

              {/* Código de pareamento */}
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    {pairingCode.split('').map((char, index) => (
                      <div
                        key={index}
                        className="w-8 h-10 bg-white border border-gray-300 rounded flex items-center justify-center text-lg font-mono font-semibold text-gray-800"
                      >
                        {char}
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center space-x-2 ml-4">
                    <Button
                      onClick={copyPairingCode}
                      variant="ghost"
                      size="sm"
                      className="text-gray-600 hover:text-gray-800"
                    >
                      {copied ? (
                        <>
                          <CheckCircle className="w-4 h-4 mr-1 text-green-600" />
                          <span className="text-green-600">Copiado</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4 mr-1" />
                          Copiar código
                        </>
                      )}
                    </Button>
                  </div>
                </div>
                
                {/* Timer de expiração */}
                <div className="mt-3 text-center">
                  <span className="text-xs text-gray-500">Expira em 115 segundos</span>
                </div>
              </div>

              {/* Botão gerar novo código */}
              <div className="flex justify-center">
                <Button
                  onClick={onGenerateNewCode}
                  disabled={isLoading}
                  variant="outline"
                  size="sm"
                  className="text-gray-600 border-gray-300"
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                  {isLoading ? 'Gerando...' : 'Gerar novo código'}
                </Button>
              </div>

              {/* Opção QR Code como alternativa */}
              {qrCode && (
                <div className="pt-4 border-t border-gray-200">
                  <Button
                    onClick={() => setShowQrCode(!showQrCode)}
                    variant="ghost"
                    size="sm"
                    className="w-full text-gray-500 hover:text-gray-700"
                  >
                    <QrCode className="w-4 h-4 mr-2" />
                    {showQrCode ? 'Ocultar QR Code' : 'Linkar usando QR Code'}
                  </Button>

                  {showQrCode && (
                    <div className="mt-4 text-center">
                      <div className="w-48 h-48 bg-white border border-gray-200 rounded-lg flex items-center justify-center mx-auto">
                        <img 
                          src={qrCode} 
                          alt="QR Code para WhatsApp" 
                          className="w-44 h-44 object-contain"
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        Escaneie com a câmera do WhatsApp
                      </p>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400 mx-auto mb-4"></div>
              <p className="text-gray-600">Carregando código de pareamento...</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
