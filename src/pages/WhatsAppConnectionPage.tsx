
import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/Layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useProfile } from '@/hooks/useProfile';
import { supabase } from '@/integrations/supabase/client';
import { QrCode, Smartphone, CheckCircle, AlertCircle, RotateCcw } from 'lucide-react';

const WhatsAppConnectionPage = () => {
  const { profile, updateProfile } = useProfile();
  const { toast } = useToast();
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [qrCode, setQrCode] = useState('');
  const [isCreatingInstance, setIsCreatingInstance] = useState(false);
  const [isGeneratingQR, setIsGeneratingQR] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);

  // Verificar status da conexão automaticamente
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (profile?.instance_name) {
      checkConnectionStatus();
      interval = setInterval(checkConnectionStatus, 10000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [profile?.instance_name]);

  const generateInstanceName = () => {
    if (!profile?.nome || !profile?.numero) return '';
    
    const nome = profile.nome.toLowerCase().replace(/[^a-z0-9]/g, '');
    const ultimosDigitos = profile.numero.slice(-4);
    return `${nome}_${ultimosDigitos}`;
  };

  const checkConnectionStatus = async () => {
    if (!profile?.instance_name) return;
    
    setIsCheckingStatus(true);
    try {
      console.log(`Verificando status da instância: ${profile.instance_name}`);
      
      const { data, error } = await supabase.functions.invoke('evolution-get-status', {
        body: { instanceName: profile.instance_name }
      });

      if (error) {
        console.error('Erro ao verificar status:', error);
        setConnectionStatus('disconnected');
        return;
      }

      const status = data.status || 'disconnected';
      console.log(`Status da conexão: ${status}`);
      
      if (status === 'open') {
        setConnectionStatus('connected');
        setQrCode(''); // Limpar QR Code quando conectado
      } else if (status === 'connecting') {
        setConnectionStatus('connecting');
      } else {
        setConnectionStatus('disconnected');
      }
    } catch (error) {
      console.error('Erro ao verificar status:', error);
      setConnectionStatus('disconnected');
    } finally {
      setIsCheckingStatus(false);
    }
  };

  const handleCreateInstance = async () => {
    if (!profile?.nome || !profile?.numero) {
      toast({
        title: 'Informações incompletas',
        description: 'Complete seu perfil antes de conectar o WhatsApp',
        variant: 'destructive'
      });
      return;
    }

    setIsCreatingInstance(true);
    try {
      const instanceName = generateInstanceName();
      console.log(`Criando instância: ${instanceName}`);
      
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) throw new Error('Usuário não autenticado');

      const { data, error } = await supabase.functions.invoke('evolution-create-instance', {
        body: { instanceName },
        headers: {
          Authorization: `Bearer ${sessionData.session.access_token}`,
        },
      });

      if (error) {
        console.error('Erro na Edge Function:', error);
        throw error;
      }
      
      if (!data.success) {
        console.error('Erro na criação:', data.error);
        throw new Error(data.error || 'Erro ao criar instância');
      }
      
      // Salvar o nome da instância no perfil
      await updateProfile({ instance_name: instanceName });
      
      toast({
        title: 'Instância criada!',
        description: 'Agora gere o QR Code para conectar seu WhatsApp'
      });
      
      setConnectionStatus('disconnected');
    } catch (error) {
      console.error('Erro ao criar instância:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível criar a instância do WhatsApp',
        variant: 'destructive'
      });
    } finally {
      setIsCreatingInstance(false);
    }
  };

  const handleGenerateQRCode = async () => {
    if (!profile?.instance_name) return;

    setIsGeneratingQR(true);
    try {
      console.log(`Gerando QR Code para: ${profile.instance_name}`);
      
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) throw new Error('Usuário não autenticado');

      const { data, error } = await supabase.functions.invoke('evolution-generate-qr', {
        body: { instanceName: profile.instance_name },
        headers: {
          Authorization: `Bearer ${sessionData.session.access_token}`,
        },
      });

      if (error) {
        console.error('Erro na Edge Function:', error);
        throw error;
      }
      
      if (!data.success) {
        console.error('Erro na geração do QR:', data.error);
        throw new Error(data.error || 'Erro ao gerar QR Code');
      }

      console.log('QR Code gerado com sucesso:', data.qrCode);
      setQrCode(data.qrCode);
      setConnectionStatus('connecting');
      
      toast({
        title: 'QR Code gerado!',
        description: 'Escaneie o QR Code com seu WhatsApp para conectar'
      });
    } catch (error) {
      console.error('Erro ao gerar QR Code:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível gerar o QR Code',
        variant: 'destructive'
      });
    } finally {
      setIsGeneratingQR(false);
    }
  };

  const getStatusDisplay = () => {
    switch (connectionStatus) {
      case 'connected':
        return {
          color: 'text-green-600',
          bg: 'bg-green-100',
          icon: CheckCircle,
          text: 'Conectado'
        };
      case 'connecting':
        return {
          color: 'text-yellow-600',
          bg: 'bg-yellow-100',
          icon: RotateCcw,
          text: 'Conectando...'
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
            Conexão WhatsApp 📱
          </h1>
          <p className="text-muted-foreground">
            Conecte seu WhatsApp Business para começar a automatizar o atendimento
          </p>
        </div>

        {/* Status Card */}
        <Card className="card-hover">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className={`w-12 h-12 rounded-full ${status.bg} flex items-center justify-center`}>
                  <StatusIcon className={`w-6 h-6 ${status.color}`} />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Status da Conexão</h3>
                  <p className={`font-medium ${status.color}`}>{status.text}</p>
                </div>
              </div>
              
              <Button
                size="sm"
                variant="outline"
                onClick={checkConnectionStatus}
                disabled={!profile?.instance_name || isCheckingStatus}
              >
                <RotateCcw className={`w-4 h-4 ${isCheckingStatus ? 'animate-spin' : ''}`} />
              </Button>
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
                <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                  1
                </div>
                <div>
                  <h4 className="font-medium text-foreground">Gerar QR Code</h4>
                  <p className="text-sm text-muted-foreground">
                    Clique no botão para gerar um QR code único
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                  2
                </div>
                <div>
                  <h4 className="font-medium text-foreground">Abrir WhatsApp</h4>
                  <p className="text-sm text-muted-foreground">
                    No seu celular, vá em Configurações → Dispositivos conectados
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                  3
                </div>
                <div>
                  <h4 className="font-medium text-foreground">Escanear QR Code</h4>
                  <p className="text-sm text-muted-foreground">
                    Aponte a câmera para o QR code e aguarde a conexão
                  </p>
                </div>
              </div>

              {!profile?.instance_name ? (
                <Button 
                  onClick={handleCreateInstance}
                  disabled={isCreatingInstance || !profile?.nome || !profile?.numero}
                  className="w-full mt-6"
                >
                  {isCreatingInstance ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Criando...
                    </>
                  ) : (
                    <>
                      <Smartphone className="w-4 h-4 mr-2" />
                      Conectar WhatsApp
                    </>
                  )}
                </Button>
              ) : connectionStatus === 'disconnected' && (
                <Button 
                  onClick={handleGenerateQRCode}
                  disabled={isGeneratingQR}
                  className="w-full mt-6"
                >
                  {isGeneratingQR ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Gerando...
                    </>
                  ) : (
                    <>
                      <QrCode className="w-4 h-4 mr-2" />
                      Gerar QR Code
                    </>
                  )}
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
                {connectionStatus === 'disconnected' && !qrCode ? (
                  <div className="w-64 h-64 bg-muted rounded-lg flex items-center justify-center">
                    <div className="text-center text-muted-foreground">
                      <span className="text-4xl block mb-2">📱</span>
                      <p>Clique em "Gerar QR Code" para começar</p>
                    </div>
                  </div>
                ) : connectionStatus === 'connecting' || qrCode ? (
                  <div className="w-64 h-64 bg-white border-2 border-border rounded-lg flex items-center justify-center relative overflow-hidden">
                    {qrCode && (
                      <img 
                        src={qrCode} 
                        alt="QR Code" 
                        className="w-56 h-56 object-contain"
                        onError={(e) => {
                          console.error('Erro ao carregar imagem do QR Code:', e);
                          toast({
                            title: 'Erro no QR Code',
                            description: 'Não foi possível carregar a imagem do QR Code',
                            variant: 'destructive'
                          });
                        }}
                      />
                    )}
                    {connectionStatus === 'connecting' && (
                      <div className="absolute inset-0 bg-white/50 flex items-center justify-center">
                        <div className="text-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                          <p className="text-sm text-muted-foreground">Aguardando scan...</p>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="w-64 h-64 bg-green-50 rounded-lg flex items-center justify-center">
                    <div className="text-center text-green-600">
                      <span className="text-6xl block mb-4">✅</span>
                      <p className="font-semibold">Conectado com sucesso!</p>
                      <p className="text-sm text-muted-foreground mt-2">
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
                <div className="flex items-center space-x-3 p-4 bg-green-50 rounded-lg">
                  <span className="text-2xl">🤖</span>
                  <div>
                    <h4 className="font-medium text-foreground">Respostas Automáticas</h4>
                    <p className="text-sm text-muted-foreground">Ativo 24/7</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3 p-4 bg-green-50 rounded-lg">
                  <span className="text-2xl">📊</span>
                  <div>
                    <h4 className="font-medium text-foreground">Coleta de Dados</h4>
                    <p className="text-sm text-muted-foreground">Qualificação ativa</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3 p-4 bg-green-50 rounded-lg">
                  <span className="text-2xl">🔄</span>
                  <div>
                    <h4 className="font-medium text-foreground">Sincronização</h4>
                    <p className="text-sm text-muted-foreground">Tempo real</p>
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

export default WhatsAppConnectionPage;
