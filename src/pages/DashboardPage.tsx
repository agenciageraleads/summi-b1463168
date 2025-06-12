
import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/Layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useChats } from '@/hooks/useChats';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { EvolutionApiService } from '@/services/evolutionApi';
import { useToast } from '@/hooks/use-toast';

const DashboardPage = () => {
  const { user } = useAuth();
  const { profile } = useProfile();
  const { chats, isLoading: chatsLoading } = useChats();
  const { toast } = useToast();
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'loading' | 'need_number'>('loading');
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [instanceName, setInstanceName] = useState<string>('');

  useEffect(() => {
    if (user) {
      const userInstanceName = `summi_${user.id.replace(/-/g, '_')}`;
      setInstanceName(userInstanceName);
      checkConnectionStatus(userInstanceName);
    }
  }, [user]);

  const checkConnectionStatus = async (instanceName: string) => {
    try {
      const status = await EvolutionApiService.getInstanceStatus(instanceName);
      if (status && status.instance.status === 'open') {
        setConnectionStatus('connected');
        setQrCode(null);
      } else {
        setConnectionStatus('disconnected');
      }
    } catch (error) {
      setConnectionStatus('disconnected');
    }
  };

  const handleConnect = async () => {
    // Verificar se o usuário tem número cadastrado
    if (!profile?.numero || profile.numero.trim() === '') {
      setConnectionStatus('need_number');
      toast({
        title: "Número necessário",
        description: "Por favor, cadastre seu número do WhatsApp nas configurações antes de conectar.",
        variant: "destructive",
      });
      return;
    }

    setConnectionStatus('loading');
    setQrCode(null);
    
    try {
      const result = await EvolutionApiService.connectWhatsApp(instanceName, profile.numero);
      
      if (result.success && result.qrCode) {
        setQrCode(result.qrCode);
        toast({
          title: "QR Code gerado",
          description: "Escaneie o QR Code com seu WhatsApp para conectar.",
        });
      } else {
        setConnectionStatus('disconnected');
        toast({
          title: "Erro na conexão",
          description: result.message || "Não foi possível gerar o QR Code.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error connecting:', error);
      setConnectionStatus('disconnected');
      toast({
        title: "Erro",
        description: "Erro inesperado ao tentar conectar.",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (prioridade: string) => {
    switch (prioridade) {
      case 'urgente':
        return 'bg-destructive text-destructive-foreground';
      case 'importante':
        return 'bg-yellow-500 text-white';
      case 'normal':
        return 'bg-muted text-muted-foreground';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 60) {
      return `${diffInMinutes} min`;
    } else if (diffInMinutes < 1440) {
      return `${Math.floor(diffInMinutes / 60)}h`;
    } else {
      return `${Math.floor(diffInMinutes / 1440)}d`;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Connection Status Card */}
        <Card className="border-border shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span>📱</span>
                <span>Status da Conexão WhatsApp</span>
              </div>
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                connectionStatus === 'connected' 
                  ? 'bg-primary text-primary-foreground' 
                  : connectionStatus === 'loading'
                  ? 'bg-yellow-500 text-white'
                  : connectionStatus === 'need_number'
                  ? 'bg-orange-500 text-white'
                  : 'bg-destructive text-destructive-foreground'
              }`}>
                {connectionStatus === 'connected' ? 'Conectado' : 
                 connectionStatus === 'loading' ? 'Conectando...' : 
                 connectionStatus === 'need_number' ? 'Número necessário' :
                 'Desconectado'}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {connectionStatus === 'need_number' && (
              <div className="text-center space-y-4">
                <p className="text-muted-foreground">
                  Para conectar seu WhatsApp, você precisa cadastrar seu número nas configurações.
                </p>
                <Button 
                  onClick={() => window.location.href = '/settings'}
                  variant="outline"
                >
                  Ir para Configurações
                </Button>
              </div>
            )}

            {connectionStatus === 'disconnected' && profile?.numero && (
              <div className="text-center space-y-4">
                <p className="text-muted-foreground">
                  Sua instância do WhatsApp não está conectada. Clique no botão abaixo para conectar.
                </p>
                <Button 
                  onClick={handleConnect}
                  className="bg-primary hover:bg-primary/90"
                >
                  Conectar WhatsApp
                </Button>
              </div>
            )}
            
            {connectionStatus === 'loading' && (
              <div className="text-center space-y-4">
                <p className="text-muted-foreground">Conectando ao WhatsApp...</p>
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              </div>
            )}

            {qrCode && (
              <div className="text-center space-y-4">
                <p className="text-muted-foreground">
                  Escaneie o QR Code abaixo com seu WhatsApp para conectar:
                </p>
                <div className="flex justify-center">
                  <img 
                    src={`data:image/png;base64,${qrCode}`} 
                    alt="QR Code WhatsApp" 
                    className="max-w-xs border rounded-lg"
                  />
                </div>
                <Button 
                  onClick={() => checkConnectionStatus(instanceName)}
                  variant="outline"
                >
                  Verificar Conexão
                </Button>
              </div>
            )}

            {connectionStatus === 'connected' && (
              <div className="text-center space-y-4">
                <p className="text-primary font-medium">
                  ✅ WhatsApp conectado com sucesso!
                </p>
                <p className="text-muted-foreground">
                  Sua instância está ativa e pronta para receber mensagens.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Conversations */}
        <Card className="border-border shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span>💬</span>
                <span>Conversas Pendentes</span>
              </div>
              <span className="text-sm text-muted-foreground">
                {chats.length} {chats.length === 1 ? 'conversa' : 'conversas'}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {chatsLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse">
                    <div className="flex items-center space-x-4 p-4 bg-muted rounded-lg">
                      <div className="w-10 h-10 bg-muted-foreground/20 rounded-full"></div>
                      <div className="flex-1">
                        <div className="h-4 bg-muted-foreground/20 rounded w-1/4 mb-2"></div>
                        <div className="h-3 bg-muted-foreground/20 rounded w-3/4"></div>
                      </div>
                      <div className="h-6 bg-muted-foreground/20 rounded w-16"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : chats.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Nenhuma conversa encontrada.</p>
                <p className="text-sm text-muted-foreground mt-2">
                  As conversas aparecerão aqui quando você receber mensagens.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {chats.slice(0, 10).map((chat, index) => (
                  <div 
                    key={chat.id}
                    className="flex items-center justify-between p-4 bg-muted rounded-lg hover:bg-muted/80 transition-colors cursor-pointer"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="flex items-center space-x-4 flex-1">
                      <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                        <span className="text-primary-foreground font-medium text-sm">
                          {chat.nome.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <h4 className="font-medium text-foreground">{chat.nome}</h4>
                          <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(chat.prioridade)}`}>
                            {chat.prioridade}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">{chat.remote_jid}</p>
                        {chat.contexto && (
                          <p className="text-sm text-foreground mt-1 truncate">
                            {chat.contexto}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">
                        {formatDate(chat.modificado_em)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {chat.conversa.length} {chat.conversa.length === 1 ? 'mensagem' : 'mensagens'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default DashboardPage;
