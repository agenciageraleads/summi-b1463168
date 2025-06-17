
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Loader2, Users, Search, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useProfile } from '@/hooks/useProfile';

// Interface para os grupos do WhatsApp retornados pela Evolution API
interface WhatsAppGroup {
  groupId: string;
  groupName: string;
  participantCount: number;
  isMonitored?: boolean;
}

// Interface para grupos monitorados armazenados no banco
interface MonitoredGroup {
  id: string;
  group_id: string;
  group_name: string;
  user_id: string;
  created_at: string;
}

export const GroupsMonitoring: React.FC = () => {
  const { toast } = useToast();
  const { profile } = useProfile();
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [instanceName, setInstanceName] = useState<string>('');
  const [groups, setGroups] = useState<WhatsAppGroup[]>([]);
  const [monitoredGroups, setMonitoredGroups] = useState<MonitoredGroup[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Verificar se o usuário atual é admin
  const isAdmin = profile?.role === 'admin';

  useEffect(() => {
    if (isAdmin && selectedUserId) {
      fetchMonitoredGroups();
    }
  }, [isAdmin, selectedUserId]);

  const fetchMonitoredGroups = async () => {
    if (!selectedUserId) return;

    try {
      console.log('[GROUPS-MONITORING] Buscando grupos monitorados para usuário:', selectedUserId);

      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        console.error('[GROUPS-MONITORING] Sessão não encontrada');
        return;
      }

      const { data, error } = await supabase.functions.invoke('get-monitored-groups', {
        body: { target_user_id: selectedUserId },
        headers: {
          Authorization: `Bearer ${session.session.access_token}`,
        },
      });

      if (error) {
        console.error('[GROUPS-MONITORING] Erro ao buscar grupos monitorados:', error);
        return;
      }

      console.log('[GROUPS-MONITORING] Grupos monitorados encontrados:', data?.length || 0);
      setMonitoredGroups(data || []);
    } catch (error) {
      console.error('[GROUPS-MONITORING] Erro inesperado ao buscar grupos monitorados:', error);
    }
  };

  const fetchWhatsAppGroups = async () => {
    if (!instanceName.trim()) {
      toast({
        title: "Erro",
        description: "Por favor, informe o nome da instância",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      console.log('[GROUPS-MONITORING] Buscando grupos para instância:', instanceName);

      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        toast({
          title: "Erro",
          description: "Sessão não encontrada",
          variant: "destructive",
        });
        return;
      }

      const { data, error } = await supabase.functions.invoke('fetch-whatsapp-groups', {
        body: { instanceName },
        headers: {
          Authorization: `Bearer ${session.session.access_token}`,
        },
      });

      if (error) {
        console.error('[GROUPS-MONITORING] Erro na função:', error);
        toast({
          title: "Erro",
          description: error.message || "Erro ao buscar grupos",
          variant: "destructive",
        });
        return;
      }

      if (!data.success) {
        toast({
          title: "Erro",
          description: data.error || "Erro ao buscar grupos",
          variant: "destructive",
        });
        return;
      }

      console.log('[GROUPS-MONITORING] Grupos encontrados:', data.groups);

      // Marcar quais grupos já estão sendo monitorados
      const groupsWithStatus = data.groups.map((group: WhatsAppGroup) => ({
        ...group,
        isMonitored: monitoredGroups.some(mg => mg.group_id === group.groupId)
      }));

      setGroups(groupsWithStatus);

      toast({
        title: "Sucesso",
        description: `${data.groups.length} grupos encontrados`,
      });

    } catch (error) {
      console.error('[GROUPS-MONITORING] Erro inesperado:', error);
      toast({
        title: "Erro",
        description: "Erro inesperado ao buscar grupos",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updateGroupMonitoring = async (group: WhatsAppGroup, shouldMonitor: boolean) => {
    if (!selectedUserId) {
      toast({
        title: "Erro",
        description: "Selecione um usuário primeiro",
        variant: "destructive",
      });
      return;
    }

    setIsUpdating(group.groupId);

    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        toast({
          title: "Erro",
          description: "Sessão não encontrada",
          variant: "destructive",
        });
        return;
      }

      const { data, error } = await supabase.functions.invoke('update-monitored-groups', {
        body: {
          userId: selectedUserId,
          groupId: group.groupId,
          groupName: group.groupName,
          action: shouldMonitor ? 'add' : 'remove'
        },
        headers: {
          Authorization: `Bearer ${session.session.access_token}`,
        },
      });

      if (error) {
        console.error('[GROUPS-MONITORING] Erro na função:', error);
        toast({
          title: "Erro",
          description: error.message || "Erro ao atualizar monitoramento",
          variant: "destructive",
        });
        return;
      }

      if (!data.success) {
        toast({
          title: "Erro",
          description: data.error || "Erro ao atualizar monitoramento",
          variant: "destructive",
        });
        return;
      }

      // Atualizar estado local
      setGroups(prevGroups =>
        prevGroups.map(g =>
          g.groupId === group.groupId ? { ...g, isMonitored: shouldMonitor } : g
        )
      );

      // Recarregar grupos monitorados
      await fetchMonitoredGroups();

      toast({
        title: "Sucesso",
        description: data.message,
      });

    } catch (error) {
      console.error('[GROUPS-MONITORING] Erro inesperado:', error);
      toast({
        title: "Erro",
        description: "Erro inesperado ao atualizar monitoramento",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(null);
    }
  };

  // Filtrar grupos baseado na busca
  const filteredGroups = groups.filter(group =>
    group.groupName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const monitoredCount = groups.filter(g => g.isMonitored).length;

  if (!isAdmin) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Acesso Restrito
            </h3>
            <p className="text-gray-600">
              Esta funcionalidade está disponível apenas para administradores.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Monitoramento de Grupos WhatsApp
            <Badge variant="secondary" className="ml-2">BETA</Badge>
          </CardTitle>
          <p className="text-sm text-gray-600">
            Selecione até 3 grupos de WhatsApp para monitoramento especial.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="userId">ID do Usuário</Label>
              <Input
                id="userId"
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                placeholder="UUID do usuário"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="instanceName">Nome da Instância</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  id="instanceName"
                  value={instanceName}
                  onChange={(e) => setInstanceName(e.target.value)}
                  placeholder="ex: usuario_1234"
                />
                <Button 
                  onClick={fetchWhatsAppGroups}
                  disabled={isLoading}
                  className="shrink-0"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Buscar'
                  )}
                </Button>
              </div>
            </div>
          </div>

          {monitoredGroups.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">
                Grupos Monitorados ({monitoredGroups.length}/3)
              </h4>
              <div className="space-y-2">
                {monitoredGroups.map((group) => (
                  <div key={group.id} className="flex items-center justify-between bg-white rounded p-2">
                    <span className="text-sm">{group.group_name}</span>
                    <Badge variant="outline" className="text-green-600 border-green-600">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Monitorado
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {groups.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>
                Grupos Disponíveis ({filteredGroups.length})
              </CardTitle>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <Input
                    placeholder="Buscar grupos..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-64"
                  />
                </div>
                <Badge 
                  variant={monitoredCount >= 3 ? "destructive" : "secondary"}
                  className="ml-2"
                >
                  {monitoredCount}/3 monitorados
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {filteredGroups.map((group) => (
                <div key={group.groupId} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <h4 className="font-medium">{group.groupName}</h4>
                    <p className="text-sm text-gray-600">
                      {group.participantCount} participantes • ID: {group.groupId}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {group.isMonitored && (
                      <Badge variant="outline" className="text-green-600 border-green-600">
                        Monitorado
                      </Badge>
                    )}
                    <Switch
                      checked={group.isMonitored || false}
                      onCheckedChange={(checked) => updateGroupMonitoring(group, checked)}
                      disabled={
                        isUpdating === group.groupId || 
                        (!group.isMonitored && monitoredCount >= 3)
                      }
                    />
                    {isUpdating === group.groupId && (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
