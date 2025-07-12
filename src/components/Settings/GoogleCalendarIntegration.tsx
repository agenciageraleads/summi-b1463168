
// ABOUTME: Componente para gerenciar integração com Google Calendar
// ABOUTME: Conectar, listar calendários e configurar preferências com UX aprimorada

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Calendar, RefreshCw, Unlink, CheckCircle, Star, Loader } from 'lucide-react';
import { useGoogleCalendar, UserCalendar } from '@/hooks/useGoogleCalendar';
import { Profile } from '@/hooks/useProfile';

interface GoogleCalendarIntegrationProps {
  profile: Profile;
  onUpdate: (updates: Partial<Profile>) => Promise<void>;
}

export const GoogleCalendarIntegration = ({ profile, onUpdate }: GoogleCalendarIntegrationProps) => {
  const {
    calendars,
    isConnecting,
    isLoading,
    connectGoogleCalendar,
    disconnectGoogleCalendar,
    syncCalendars,
    updateCalendarSettings,
    loadUserCalendars,
  } = useGoogleCalendar({
    onRefreshProfile: async () => {
      // Esta função será chamada automaticamente após o sucesso da conexão
      // O refresh do perfil será feito pelo componente pai
      console.log('[GOOGLE_CALENDAR] Auto-refresh solicitado');
    }
  });

  const [isUpdating, setIsUpdating] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
  const isConnected = profile.google_calendar_connected;

  useEffect(() => {
    if (isConnected && profile.id) {
      setConnectionStatus('connected');
      loadUserCalendars(profile.id);
    } else {
      setConnectionStatus('idle');
    }
  }, [isConnected, profile.id, loadUserCalendars]);

  useEffect(() => {
    if (isConnecting) {
      setConnectionStatus('connecting');
    }
  }, [isConnecting]);

  const handleConnect = async () => {
    if (!profile.id) return;
    
    setConnectionStatus('connecting');
    
    const success = await connectGoogleCalendar(profile.id);
    if (success) {
      // Atualiza o perfil local - o hook já cuida do refresh automático
      await onUpdate({ google_calendar_connected: true });
      setConnectionStatus('connected');
      // Carrega os calendários
      await loadUserCalendars(profile.id);
    } else {
      setConnectionStatus('error');
      // Volta para idle após 3 segundos
      setTimeout(() => setConnectionStatus('idle'), 3000);
    }
  };

  const handleDisconnect = async () => {
    if (!profile.id) return;
    
    const success = await disconnectGoogleCalendar(profile.id);
    if (success) {
      await onUpdate({ 
        google_calendar_connected: false,
        default_calendar_id: undefined,
        calendar_preferences: {}
      });
      setConnectionStatus('idle');
    }
  };

  const handleSync = async () => {
    if (!profile.id) return;
    await syncCalendars(profile.id);
  };

  const handleToggleCalendar = async (calendar: UserCalendar) => {
    setIsUpdating(true);
    try {
      await updateCalendarSettings(calendar.calendar_id, {
        is_enabled: !calendar.is_enabled
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSetDefault = async (calendar: UserCalendar) => {
    setIsUpdating(true);
    try {
      const success = await updateCalendarSettings(calendar.calendar_id, {
        is_default: true
      });
      
      if (success) {
        await onUpdate({ default_calendar_id: calendar.calendar_id });
      }
    } finally {
      setIsUpdating(false);
    }
  };

  const getConnectionStatusContent = () => {
    switch (connectionStatus) {
      case 'connecting':
        return (
          <div className="flex flex-col items-center gap-4 py-6">
            <div className="flex items-center gap-2">
              <Loader className="h-5 w-5 animate-spin text-blue-500" />
              <span className="font-medium text-blue-600">Conectando ao Google Calendar...</span>
            </div>
            <p className="text-sm text-muted-foreground text-center">
              Uma nova janela foi aberta para autorização. <br />
              Após autorizar, esta página será atualizada automaticamente.
            </p>
          </div>
        );
      
      case 'error':
        return (
          <div className="flex flex-col items-center gap-4 py-6">
            <div className="text-center">
              <h3 className="font-medium mb-2 text-red-600">Erro na Conexão</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Não foi possível conectar ao Google Calendar. Tente novamente.
              </p>
            </div>
            <Button 
              onClick={handleConnect}
              disabled={isConnecting}
              variant="outline"
              className="min-w-[200px]"
            >
              <Calendar className="mr-2 h-4 w-4" />
              Tentar Novamente
            </Button>
          </div>
        );

      default:
        return (
          <div className="flex flex-col items-center gap-4 py-6">
            <div className="text-center">
              <h3 className="font-medium mb-2">Conectar Google Calendar</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Permita que a Summi acesse sua agenda para fornecer contexto temporal 
                em suas análises e criar eventos baseados em suas conversas.
              </p>
            </div>
            <Button 
              onClick={handleConnect}
              disabled={isConnecting}
              className="min-w-[200px]"
            >
              <Calendar className="mr-2 h-4 w-4" />
              Conectar Google Calendar
            </Button>
          </div>
        );
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Google Calendar
        </CardTitle>
        <CardDescription>
          Conecte sua agenda do Google para integração inteligente com suas mensagens.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isConnected ? (
          getConnectionStatusContent()
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span className="font-medium">Google Calendar Conectado</span>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSync}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  Sincronizar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDisconnect}
                  disabled={isLoading}
                >
                  <Unlink className="mr-2 h-4 w-4" />
                  Desconectar
                </Button>
              </div>
            </div>

            {calendars.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-medium">Seus Calendários</h4>
                <div className="space-y-2">
                  {calendars.map((calendar) => (
                    <div
                      key={calendar.calendar_id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: calendar.color }}
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{calendar.calendar_name}</span>
                            {calendar.is_default && (
                              <Badge variant="secondary" className="text-xs">
                                <Star className="w-3 h-3 mr-1" />
                                Padrão
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">Habilitado</span>
                          <Switch
                            checked={calendar.is_enabled}
                            onCheckedChange={() => handleToggleCalendar(calendar)}
                            disabled={isUpdating}
                          />
                        </div>
                        
                        {calendar.is_enabled && !calendar.is_default && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSetDefault(calendar)}
                            disabled={isUpdating}
                          >
                            Definir como Padrão
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-md">
                  <strong>Dica:</strong> O calendário padrão será usado para criar novos eventos 
                  baseados em suas conversas. Calendários habilitados serão considerados 
                  no contexto das análises da Summi.
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
