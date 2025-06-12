
import { useState } from 'react';
import { DashboardLayout } from '@/components/Layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

const WhatsAppConnectionPage = () => {
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [qrCode, setQrCode] = useState('');
  const { toast } = useToast();

  const generateQRCode = () => {
    setConnectionStatus('connecting');
    setQrCode('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ3aGl0ZSIvPgogIDx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0ibW9ub3NwYWNlIiBmb250LXNpemU9IjE0cHgiIGZpbGw9ImJsYWNrIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iMC4zZW0iPjxzdmcgd2lkdGg9IjE4MCIgaGVpZ2h0PSIxODAiIHZpZXdCb3g9IjAgMCAyMDAwIDIwMDAiPjxyZWN0IHdpZHRoPSIyMDAwIiBoZWlnaHQ9IjIwMDAiIGZpbGw9IiNmZmYiLz48ZyBmaWxsPSIjMDAwIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIvPjxyZWN0IHg9IjQwMCIgd2lkdGg9IjIwMCIgaGVpZ2h0PSIyMDAiLz48cmVjdCB4PSI4MDAiIHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIi8+PHJlY3QgeD0iMTYwMCIgd2lkdGg9IjIwMCIgaGVpZ2h0PSIyMDAiLz48L2c+PC9zdmc+PC90ZXh0Pgo8L3N2Zz4K');
    
    // Simulate QR code scanning after 3 seconds
    setTimeout(() => {
      setConnectionStatus('connected');
      toast({
        title: "Conectado com sucesso! 🎉",
        description: "Seu WhatsApp foi conectado à Summi",
      });
    }, 3000);
  };

  const disconnect = () => {
    setConnectionStatus('disconnected');
    setQrCode('');
    toast({
      title: "Desconectado",
      description: "WhatsApp foi desconectado da Summi",
      variant: "destructive"
    });
  };

  const getStatusDisplay = () => {
    switch (connectionStatus) {
      case 'connected':
        return {
          color: 'text-summi-green',
          bg: 'bg-summi-green/10',
          icon: '✅',
          text: 'Conectado'
        };
      case 'connecting':
        return {
          color: 'text-yellow-600',
          bg: 'bg-yellow-100',
          icon: '⏳',
          text: 'Conectando...'
        };
      default:
        return {
          color: 'text-red-500',
          bg: 'bg-red-100',
          icon: '❌',
          text: 'Desconectado'
        };
    }
  };

  const status = getStatusDisplay();

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-summi-gray-900 mb-2">
            Conexão WhatsApp 📱
          </h1>
          <p className="text-summi-gray-600">
            Conecte seu WhatsApp Business para começar a automatizar o atendimento
          </p>
        </div>

        {/* Status Card */}
        <Card className="card-hover">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className={`w-12 h-12 rounded-full ${status.bg} flex items-center justify-center`}>
                  <span className="text-2xl">{status.icon}</span>
                </div>
                <div>
                  <h3 className="font-semibold text-summi-gray-900">Status da Conexão</h3>
                  <p className={`font-medium ${status.color}`}>{status.text}</p>
                </div>
              </div>
              
              {connectionStatus === 'connected' && (
                <Button 
                  variant="outline" 
                  onClick={disconnect}
                  className="border-red-300 text-red-600 hover:bg-red-50"
                >
                  Desconectar
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Connection Steps */}
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
                <div className="w-6 h-6 bg-summi-blue text-white rounded-full flex items-center justify-center text-sm font-bold">
                  1
                </div>
                <div>
                  <h4 className="font-medium text-summi-gray-900">Gerar QR Code</h4>
                  <p className="text-sm text-summi-gray-600">
                    Clique no botão para gerar um QR code único
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-summi-blue text-white rounded-full flex items-center justify-center text-sm font-bold">
                  2
                </div>
                <div>
                  <h4 className="font-medium text-summi-gray-900">Abrir WhatsApp</h4>
                  <p className="text-sm text-summi-gray-600">
                    No seu celular, vá em Configurações → Dispositivos conectados
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-summi-blue text-white rounded-full flex items-center justify-center text-sm font-bold">
                  3
                </div>
                <div>
                  <h4 className="font-medium text-summi-gray-900">Escanear QR Code</h4>
                  <p className="text-sm text-summi-gray-600">
                    Aponte a câmera para o QR code e aguarde a conexão
                  </p>
                </div>
              </div>

              {connectionStatus === 'disconnected' && (
                <Button 
                  onClick={generateQRCode}
                  className="w-full btn-primary mt-6"
                >
                  🔗 Gerar QR Code
                </Button>
              )}
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
                {connectionStatus === 'disconnected' ? (
                  <div className="w-64 h-64 bg-summi-gray-100 rounded-lg flex items-center justify-center">
                    <div className="text-center text-summi-gray-500">
                      <span className="text-4xl block mb-2">📱</span>
                      <p>Clique em "Gerar QR Code" para começar</p>
                    </div>
                  </div>
                ) : connectionStatus === 'connecting' ? (
                  <div className="w-64 h-64 bg-white border-2 border-summi-gray-200 rounded-lg flex items-center justify-center relative overflow-hidden">
                    {qrCode && (
                      <img 
                        src={qrCode} 
                        alt="QR Code" 
                        className="w-56 h-56 animate-pulse-slow"
                      />
                    )}
                    <div className="absolute inset-0 bg-white/50 flex items-center justify-center">
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-summi-blue mx-auto mb-2"></div>
                        <p className="text-sm text-summi-gray-600">Aguardando scan...</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="w-64 h-64 bg-summi-green/10 rounded-lg flex items-center justify-center">
                    <div className="text-center text-summi-green">
                      <span className="text-6xl block mb-4">✅</span>
                      <p className="font-semibold">Conectado com sucesso!</p>
                      <p className="text-sm text-summi-gray-600 mt-2">
                        Sua Summi está pronta para atender
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Connected Features */}
        {connectionStatus === 'connected' && (
          <Card className="card-hover animate-fade-in">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <span>⚡</span>
                <span>Recursos Ativos</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="flex items-center space-x-3 p-4 bg-summi-green/10 rounded-lg">
                  <span className="text-2xl">🤖</span>
                  <div>
                    <h4 className="font-medium text-summi-gray-900">Respostas Automáticas</h4>
                    <p className="text-sm text-summi-gray-600">Ativo 24/7</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3 p-4 bg-summi-green/10 rounded-lg">
                  <span className="text-2xl">📊</span>
                  <div>
                    <h4 className="font-medium text-summi-gray-900">Coleta de Dados</h4>
                    <p className="text-sm text-summi-gray-600">Qualificação ativa</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3 p-4 bg-summi-green/10 rounded-lg">
                  <span className="text-2xl">🔄</span>
                  <div>
                    <h4 className="font-medium text-summi-gray-900">Sincronização</h4>
                    <p className="text-sm text-summi-gray-600">Tempo real</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default WhatsAppConnectionPage;
