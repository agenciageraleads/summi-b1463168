// ABOUTME: Dashboard de segurança para administradores
// ABOUTME: Exibe logs de auditoria, atividades suspeitas e métricas de segurança

import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Shield, Users, Activity } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useEnhancedSecurity } from '@/hooks/useEnhancedSecurity';

interface SecurityEvent {
  id: string;
  user_id: string;
  event_type: string;
  event_details: Record<string, unknown> | null;
  severity: 'low' | 'medium' | 'high' | 'critical';
  created_at: string;
}

interface SecurityStats {
  total_events: number;
  critical_events: number;
  rate_limit_violations: number;
  unauthorized_attempts: number;
}

export const SecurityDashboard: React.FC = () => {
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([]);
  const [securityStats, setSecurityStats] = useState<SecurityStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { logSecurityEvent, validateAdminAccess } = useEnhancedSecurity();

  useEffect(() => {
    loadSecurityData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadSecurityData = async () => {
    try {
      // Verify admin access
      const isAdmin = await validateAdminAccess('security_dashboard_access');
      if (!isAdmin) {
        toast({
          title: "Acesso Negado",
          description: "Apenas administradores podem acessar o dashboard de segurança",
          variant: "destructive",
        });
        return;
      }

      setIsLoading(true);

      // Load recent security events
      const { data: events, error: eventsError } = await supabase
        .from('security_audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (eventsError) {
        throw eventsError;
      }

      setSecurityEvents((events || []) as SecurityEvent[]);

      // Calculate security statistics
      const stats: SecurityStats = {
        total_events: events?.length || 0,
        critical_events: events?.filter(e => e.severity === 'critical').length || 0,
        rate_limit_violations: events?.filter(e => e.event_type === 'rate_limit_exceeded').length || 0,
        unauthorized_attempts: events?.filter(e => e.event_type === 'unauthorized_access').length || 0,
      };

      setSecurityStats(stats);

    } catch (error) {
      console.error('Erro ao carregar dados de segurança:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar dados de segurança",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'outline';
    }
  };

  const formatEventDetails = (details: Record<string, unknown> | null) => {
    if (!details || typeof details !== 'object') return 'N/A';

    const keys = Object.keys(details);
    if (keys.length === 0) return 'N/A';

    return keys.slice(0, 3).map(key =>
      `${key}: ${String(details[key]).substring(0, 50)}`
    ).join(', ');
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Shield className="h-6 w-6" />
          <h2 className="text-2xl font-bold">Dashboard de Segurança</h2>
        </div>
        <div className="text-center py-8">Carregando dados de segurança...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-6 w-6" />
          <h2 className="text-2xl font-bold">Dashboard de Segurança</h2>
        </div>
        <Button onClick={loadSecurityData} variant="outline">
          Atualizar
        </Button>
      </div>

      {/* Security Statistics */}
      {securityStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Eventos</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{securityStats.total_events}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Eventos Críticos</CardTitle>
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{securityStats.critical_events}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Rate Limits</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{securityStats.rate_limit_violations}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Acessos Negados</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{securityStats.unauthorized_attempts}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Recent Security Events */}
      <Card>
        <CardHeader>
          <CardTitle>Eventos de Segurança Recentes</CardTitle>
          <CardDescription>
            Últimos 50 eventos de segurança registrados no sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {securityEvents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum evento de segurança registrado
              </div>
            ) : (
              securityEvents.map((event) => (
                <div
                  key={event.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={getSeverityColor(event.severity)}>
                        {event.severity.toUpperCase()}
                      </Badge>
                      <span className="font-medium">{event.event_type.replace(/_/g, ' ')}</span>
                    </div>
                    <div className="text-sm text-muted-foreground mb-1">
                      Usuário: {event.user_id}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {formatEventDetails(event.event_details)}
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground text-right">
                    {new Date(event.created_at).toLocaleString('pt-BR')}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};