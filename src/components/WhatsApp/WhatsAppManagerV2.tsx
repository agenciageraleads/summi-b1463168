
// ABOUTME: Componente manager otimizado usando nova arquitetura de Edge Functions
// ABOUTME: Interface limpa com foco no código de pareamento e QR Code como fallback
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useProfile } from '@/hooks/useProfile';
import { useWhatsAppConnectionV2 } from '@/hooks/useWhatsAppConnectionV2';
import { useToast } from '@/hooks/use-toast';
import { 
  MessageSquare, 
  Loader2, 
  CheckCircle, 
  AlertCircle, 
  Smartphone,
  Copy,
  QrCode,
  ArrowLeft,
  Settings,
  Power
} from 'lucide-react';

export const WhatsAppManagerV2 = () => {
  const { profile } = useProfile();
  const { connectionData, connect, disconnect } = useWhatsAppConnectionV2();
  const { toast } = useToast();
  const [showQrFallback, setShowQrFallback] = useState(false);

  // Função para copiar código de pareamento
  const handleCopyPairingCode = async () => {
    if (!connectionData.pairingCode) return;
    
    try {
      await navigator.clipboard.writeText(connectionData.pairingCode);
      toast({
        title: "Código copiado!",
        description: "O código de pareamento foi copiado para a área de transferência.",
        duration: 3000
      });
    } catch (error) {
      console.error('Erro ao copiar código:', error);
      toast({
        title: "Erro ao copiar",
        description: "Não foi possível copiar o código. Tente novamente.",
        variant: "destructive"
      });
    }
  };

  // Renderizar badge de status
  const renderStatusBadge = () => {
    switch (connectionData.state) {
      case 'connected':
        return (
          <Badge className="bg-green-100 text-green-800 border-green-200">
            <CheckCircle className="w-3 h-3 mr-1" />
            Conectado
          </Badge>
        );
      case 'awaiting_pairing':
      case 'loading':
        return (
          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
            {connectionData.state === 'loading' ? 'Conectando' : 'Aguardando'}
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
            <Smartphone className="w-3 h-3 mr-1" />
            Desconectado
          </Badge>
        );
    }
  };

  // Renderizar botões de ação
  const renderActionButtons = () => {
    if (connectionData.isLoading) {
      return (
        <Button disabled size="sm" className="w-full">
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          Processando...
        </Button>
      );
    }

    switch (connectionData.state) {
      case 'connected':
        return (
          <div className="flex space-x-2">
            <Button variant="outline" size="sm" className="flex-1">
              <Settings className="w-4 h-4 mr-2" />
              Preferências
            </Button>
            <Button onClick={disconnect} variant="destructive" size="sm" className="flex-1">
              <Power className="w-4 h-4 mr-2" />
              Desconectar
            </Button>
          </div>
        );
      case 'error':
        return (
          <Button onClick={connect} variant="outline" size="sm" className="w-full">
            Tentar Novamente
          </Button>
        );
      default:
        return (
          <Button 
            onClick={connect} 
            size="sm" 
            className="w-full"
            disabled={!profile?.numero}
          >
            <Smartphone className="w-4 h-4 mr-2" />
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
          <span>WhatsApp Business</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status da Conexão */}
        <div className="flex flex-col items-center space-y-3">
          <div className="flex items-center space-x-2">
            {renderStatusBadge()}
          </div>
        </div>

        {/* Mensagem de Status */}
        <p className="text-sm text-muted-foreground text-center">{connectionData.message}</p>

        {/* Erro */}
        {connectionData.error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-700">{connectionData.error}</p>
          </div>
        )}

        {/* CÓDIGO DE PAREAMENTO - MÉTODO PRINCIPAL */}
        {connectionData.pairingCode && !showQrFallback && (
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4">
              <div className="text-center space-y-4">
                <div className="flex items-center justify-center space-x-2">
                  <Smartphone className="w-5 h-5 text-blue-600" />
                  <h3 className="font-semibold text-blue-800">Código de Pareamento</h3>
                </div>
                
                {/* Código em destaque */}
                <div className="p-4 bg-white rounded-lg border-2 border-blue-300">
                  <div className="text-3xl font-mono font-bold text-blue-900 tracking-wider">
                    {connectionData.pairingCode}
                  </div>
                </div>
                
                {/* Botão para copiar */}
                <Button 
                  onClick={handleCopyPairingCode}
                  variant="outline"
                  size="sm"
                  className="border-blue-300 text-blue-700 hover:bg-blue-100"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copiar Código
                </Button>
                
                {/* Instruções */}
                <div className="text-sm text-blue-700 space-y-2">
                  <p className="font-medium">Como usar:</p>
                  <ol className="text-left space-y-1 list-decimal list-inside">
                    <li>Abra o WhatsApp no seu celular</li>
                    <li>Menu → Aparelhos Conectados</li>
                    <li>Conectar um aparelho</li>
                    <li>Conectar com número de telefone</li>
                    <li>Digite o código acima</li>
                  </ol>
                </div>
                
                {/* Fallback para QR Code */}
                {connectionData.qrBase64 && (
                  <div className="pt-2 border-t border-blue-200">
                    <Button
                      onClick={() => setShowQrFallback(true)}
                      variant="ghost"
                      size="sm"
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <QrCode className="w-4 h-4 mr-2" />
                      Prefere usar o QR Code?
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* QR CODE - MÉTODO FALLBACK */}
        {connectionData.qrBase64 && showQrFallback && (
          <Card className="bg-gray-50 border-gray-200">
            <CardContent className="p-4">
              <div className="text-center space-y-4">
                {/* Botão voltar para pairing code */}
                {connectionData.pairingCode && (
                  <div className="flex justify-start">
                    <Button
                      onClick={() => setShowQrFallback(false)}
                      variant="ghost"
                      size="sm"
                      className="text-gray-600 hover:text-gray-800"
                    >
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Voltar ao código
                    </Button>
                  </div>
                )}
                
                <div className="flex items-center justify-center space-x-2">
                  <QrCode className="w-5 h-5 text-gray-600" />
                  <h3 className="font-semibold text-gray-800">QR Code</h3>
                </div>
                
                <div className="flex justify-center">
                  <img 
                    src={connectionData.qrBase64} 
                    alt="QR Code para conectar WhatsApp" 
                    className="max-w-[200px] max-h-[200px] border rounded-lg" 
                  />
                </div>
                
                <div className="text-sm text-gray-600 space-y-2">
                  <p className="font-medium">Como usar:</p>
                  <ol className="text-left space-y-1 list-decimal list-inside">
                    <li>Abra o WhatsApp no seu celular</li>
                    <li>Menu → Aparelhos Conectados</li>
                    <li>Conectar um aparelho</li>
                    <li>Escaneie o QR Code acima</li>
                  </ol>
                </div>
                
                <p className="text-xs text-gray-500">
                  O código expira em aproximadamente 90 segundos
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Número de Telefone (se conectado) */}
        {connectionData.state === 'connected' && profile?.numero && (
          <div className="flex justify-center">
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <Smartphone className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-green-800">
                  Telefone: {profile.numero.replace(/(\d{2})(\d{2})(\d{5})(\d{4})/, '+$1 ($2) $3-$4')}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Aviso de configuração necessária */}
        {!profile?.numero && (
          <div className="flex items-center justify-center space-x-2 p-3 bg-orange-50 rounded-lg">
            <AlertCircle className="w-4 h-4 text-orange-500" />
            <span className="text-sm text-orange-700">
              Configure seu número de telefone no perfil
            </span>
          </div>
        )}

        {/* Botões de Ação */}
        <div className="space-y-2">
          {renderActionButtons()}
        </div>
      </CardContent>
    </Card>
  );
};
