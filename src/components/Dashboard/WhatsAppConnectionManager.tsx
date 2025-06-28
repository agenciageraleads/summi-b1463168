
// Componente com foco no Pairing Code como método principal de conexão
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useProfile } from '@/hooks/useProfile';
import { useNavigate } from 'react-router-dom';
import { useWhatsAppManager } from '@/hooks/useWhatsAppManager';
import { useToast } from '@/hooks/use-toast';
import { 
  MessageSquare, 
  Loader2, 
  CheckCircle, 
  AlertCircle, 
  Unlink, 
  Settings, 
  RefreshCw,
  Copy,
  QrCode,
  Smartphone,
  ArrowLeft
} from 'lucide-react';

export const WhatsAppConnectionManager: React.FC = () => {
  const { profile } = useProfile();
  const navigate = useNavigate();
  const { state, handleConnect, handleDisconnect, handleRecreateForPairingCode, handleToggleQrFallback } = useWhatsAppManager();
  const { toast } = useToast();

  // Função para copiar pairing code
  const handleCopyPairingCode = async () => {
    if (!state.pairingCode) return;
    
    try {
      await navigator.clipboard.writeText(state.pairingCode);
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
    switch (state.connectionState) {
      case 'already_connected':
        return (
          <Badge className="bg-green-100 text-green-800 border-green-200">
            <CheckCircle className="w-3 h-3 mr-1" />
            Conectado
          </Badge>
        );
      case 'is_connecting':
      case 'needs_pairing_code':
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
            <Smartphone className="w-3 h-3 mr-1" />
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
          <Button variant="outline" size="sm" onClick={() => navigate('/settings')}>
            <Settings className="w-4 h-4 mr-2" />
            Configurar Telefone
          </Button>
        );
      case 'needs_pairing_code':
      case 'needs_qr_code':
        return (
          <div className="flex flex-col space-y-2">
            <Button onClick={handleConnect} size="sm">
              <Smartphone className="w-4 h-4 mr-2" />
              Conectar WhatsApp
            </Button>
            {profile?.instance_name && (
              <Button 
                onClick={handleRecreateForPairingCode} 
                variant="outline" 
                size="sm"
                title="Gerar novo código de pareamento"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Gerar novo código
              </Button>
            )}
          </div>
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
          <div className="flex flex-col space-y-2">
            <Button onClick={handleConnect} variant="outline" size="sm">
              Tentar Novamente
            </Button>
            {profile?.instance_name && (
              <Button 
                onClick={handleRecreateForPairingCode} 
                variant="outline" 
                size="sm"
                title="Recriar instância para resolver problemas"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Recriar Instância
              </Button>
            )}
          </div>
        );
      default:
        return (
          <Button onClick={handleConnect} size="sm">
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

        {/* PAIRING CODE - MÉTODO PRINCIPAL */}
        {state.pairingCode && !state.showQrFallback && (
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
                    {state.pairingCode}
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
                
                {/* Link para fallback QR Code */}
                {state.qrCode && (
                  <div className="pt-2 border-t border-blue-200">
                    <Button
                      onClick={handleToggleQrFallback}
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
        {state.qrCode && state.showQrFallback && (
          <Card className="bg-gray-50 border-gray-200">
            <CardContent className="p-4">
              <div className="text-center space-y-4">
                {/* Botão voltar para pairing code */}
                {state.pairingCode && (
                  <div className="flex justify-start">
                    <Button
                      onClick={handleToggleQrFallback}
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
                    src={state.qrCode} 
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
                  O código expira em aproximadamente 60 segundos
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Número de Telefone (se conectado) */}
        {state.connectionState === 'already_connected' && profile?.numero && (
          <div className="flex justify-center">
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <Smartphone className="w-4 h-4 text-green-600" />
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
      </CardContent>
    </Card>
  );
};
