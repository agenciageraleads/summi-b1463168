import { useState } from 'react';
import { DashboardLayout } from '@/components/Layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useProfile } from '@/hooks/useProfile';
import { useWhatsAppConnection } from '@/hooks/useWhatsAppConnection';
import { CheckCircle, AlertCircle, RotateCcw, Smartphone } from 'lucide-react';

const WhatsAppConnectionV2Page = () => {
  const { profile } = useProfile();
  const [currentStatus, setCurrentStatus] = useState<string>('DISCONNECTED');
  const [currentQRCode, setCurrentQRCode] = useState<string | null>(null);

  const {
    isLoading,
    polling,
    handleConnect,
    handleDisconnect
  } = useWhatsAppConnection({
    onStatusChange: setCurrentStatus,
    onQRCodeChange: setCurrentQRCode
  });

  // Função para obter informações de display do status
  const getStatusDisplay = () => {
    switch (currentStatus) {
      case 'CONNECTED':
        return {
          color: 'text-green-600',
          bg: 'bg-green-100',
          icon: CheckCircle,
          text: 'Conectado'
        };
      case 'CONNECTING':
        return {
          color: 'text-yellow-600',
          bg: 'bg-yellow-100',
          icon: RotateCcw,
          text: polling ? 'Aguardando conexão...' : 'Conectando...'
        };
      default:
        return {
          color: 'text-red-500',
          bg: 'bg-red-100',
          icon: AlertCircle,
          text: 'Desconectado'
        };
    }
  };

  const status = getStatusDisplay();
  const StatusIcon = status.icon;

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Conexão WhatsApp v2 📱
          </h1>
          <p className="text-muted-foreground">
            Sistema aprimorado de conexão com webhook automático
          </p>
        </div>

        {/* Status Card */}
        <Card className="card-hover">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className={`w-12 h-12 rounded-full ${status.bg} flex items-center justify-center`}>
                  <StatusIcon className={`w-6 h-6 ${status.color} ${currentStatus === 'CONNECTING' ? 'animate-spin' : ''}`} />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Status da Conexão</h3>
                  <p className={`font-medium ${status.color}`}>{status.text}</p>
                  {polling && (
                    <p className="text-sm text-muted-foreground">
                      Monitorando conexão...
                    </p>
                  )}
                </div>
              </div>
              
              <div className="flex space-x-2">
                {currentStatus === 'DISCONNECTED' && (
                  <Button 
                    onClick={handleConnect}
                    disabled={isLoading || !profile?.nome || !profile?.numero}
                    className="flex items-center"
                  >
                    {isLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Processando...
                      </>
                    ) : (
                      <>
                        <Smartphone className="w-4 h-4 mr-2" />
                        Conectar WhatsApp
                      </>
                    )}
                  </Button>
                )}
                
                {currentStatus === 'CONNECTED' && (
                  <Button 
                    onClick={handleDisconnect}
                    disabled={isLoading}
                    variant="destructive"
                  >
                    Desconectar
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Instruções e QR Code */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Instructions */}
          <Card className="card-hover">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <span>📋</span>
                <span>Como conectar</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                  1
                </div>
                <div>
                  <h4 className="font-medium text-foreground">Criar Instância</h4>
                  <p className="text-sm text-muted-foreground">
                    Cria automaticamente a instância com webhook configurado
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                  2
                </div>
                <div>
                  <h4 className="font-medium text-foreground">Gerar QR Code</h4>
                  <p className="text-sm text-muted-foreground">
                    QR Code é gerado automaticamente após criar a instância
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                  3
                </div>
                <div>
                  <h4 className="font-medium text-foreground">Monitoramento</h4>
                  <p className="text-sm text-muted-foreground">
                    Sistema monitora a conexão automaticamente a cada 4 segundos
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* QR Code Display */}
          <Card className="card-hover">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <span>📱</span>
                <span>QR Code</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center space-y-4">
                {currentStatus === 'DISCONNECTED' && !currentQRCode ? (
                  <div className="w-64 h-64 bg-muted rounded-lg flex items-center justify-center">
                    <div className="text-center text-muted-foreground">
                      <span className="text-4xl block mb-2">📱</span>
                      <p>Clique em "Conectar WhatsApp" para começar</p>
                    </div>
                  </div>
                ) : currentStatus === 'CONNECTING' && currentQRCode ? (
                  <div className="w-64 h-64 bg-white border-2 border-border rounded-lg flex items-center justify-center relative overflow-hidden">
                    <img 
                      src={currentQRCode} 
                      alt="QR Code" 
                      className="w-56 h-56 object-contain"
                    />
                  </div>
                ) : currentStatus === 'CONNECTED' ? (
                  <div className="w-64 h-64 bg-green-50 rounded-lg flex items-center justify-center">
                    <div className="text-center text-green-600">
                      <span className="text-6xl block mb-4">✅</span>
                      <p className="font-semibold">Conectado com sucesso!</p>
                      <p className="text-sm text-muted-foreground mt-2">
                        Webhook configurado automaticamente
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="w-64 h-64 bg-muted rounded-lg flex items-center justify-center">
                    <div className="text-center text-muted-foreground">
                      <span className="text-4xl block mb-2">⏳</span>
                      <p>Processando...</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recursos Ativos */}
        {currentStatus === 'CONNECTED' && (
          <Card className="card-hover animate-fade-in">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <span>⚡</span>
                <span>Recursos Ativos v2</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="flex items-center space-x-3 p-4 bg-green-50 rounded-lg">
                  <span className="text-2xl">🔗</span>
                  <div>
                    <h4 className="font-medium text-foreground">Webhook Automático</h4>
                    <p className="text-sm text-muted-foreground">Configurado na criação</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3 p-4 bg-green-50 rounded-lg">
                  <span className="text-2xl">📨</span>
                  <div>
                    <h4 className="font-medium text-foreground">Eventos MESSAGES_UPSERT</h4>
                    <p className="text-sm text-muted-foreground">Captura todas as mensagens</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3 p-4 bg-green-50 rounded-lg">
                  <span className="text-2xl">🔄</span>
                  <div>
                    <h4 className="font-medium text-foreground">Dados em Base64</h4>
                    <p className="text-sm text-muted-foreground">Formato otimizado</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Informações do Perfil Incompleto */}
        {(!profile?.nome || !profile?.numero) && (
          <Card className="border-orange-200 bg-orange-50">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-orange-800">
                <AlertCircle className="w-5 h-5" />
                <span>Complete seu perfil</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-orange-700 mb-4">
                Para conectar o WhatsApp, você precisa completar as informações do seu perfil.
              </p>
              <Button variant="outline" className="border-orange-300 text-orange-800 hover:bg-orange-100">
                Ir para Configurações
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default WhatsAppConnectionV2Page;
