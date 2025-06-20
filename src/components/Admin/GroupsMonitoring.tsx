import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { RefreshCw, Search, Users, Trash2, Plus, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface WhatsAppGroup {
  id: string;
  name: string;
  participants: number;
  isMonitored: boolean;
  lastUpdated?: string;
}

export const GroupsMonitoring: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [groups, setGroups] = useState<WhatsAppGroup[]>([]);
  const [monitoredGroups, setMonitoredGroups] = useState<WhatsAppGroup[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [lastCacheUpdate, setLastCacheUpdate] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadCachedGroups();
      fetchMonitoredGroups();
    }
  }, [user]);

  // Carregar grupos do cache
  const loadCachedGroups = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('manage-whatsapp-groups-cache', {
        body: { action: 'get_cached' },
      });

      if (error) throw error;

      if (data.success) {
        setGroups(data.groups || []);
        if (data.groups?.length > 0) {
          setLastCacheUpdate(data.groups[0]?.lastUpdated);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar grupos do cache:', error);
      // Se não há cache, mostrar que precisa atualizar
      setGroups([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Atualizar grupos da API e salvar no cache
  const refreshGroupsFromApi = async () => {
    if (!user) return;

    setIsRefreshing(true);
    try {
      const { data, error } = await supabase.functions.invoke('manage-whatsapp-groups-cache', {
        body: { action: 'refresh_from_api' },
      });

      if (error) throw error;

      if (data.success) {
        setGroups(data.groups || []);
        setLastCacheUpdate(new Date().toISOString());
        toast({
          title: "Grupos atualizados",
          description: `${data.groups?.length || 0} grupos encontrados e salvos no cache`,
        });
      } else {
        throw new Error(data.error || 'Erro ao buscar grupos');
      }
    } catch (error) {
      console.error('Erro ao atualizar grupos:', error);
      toast({
        title: "Erro",
        description: "Erro ao buscar grupos do WhatsApp",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const fetchMonitoredGroups = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('monitored_whatsapp_groups')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;

      const monitored = (data || []).map(group => ({
        id: group.group_id,
        name: group.group_name,
        participants: 0,
        isMonitored: true
      }));

      setMonitoredGroups(monitored);
    } catch (error) {
      console.error('Erro ao buscar grupos monitorados:', error);
    }
  };

  const addToMonitoring = async () => {
    if (!user || selectedGroups.length === 0) return;

    try {
      const groupsToAdd = groups.filter(g => selectedGroups.includes(g.id));
      
      const { error } = await supabase.functions.invoke('update-monitored-groups', {
        body: {
          userId: user.id,
          action: 'add',
          groups: groupsToAdd.map(g => ({
            group_id: g.id,
            group_name: g.name
          }))
        },
      });

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: `${selectedGroups.length} grupo(s) adicionado(s) ao monitoramento`,
      });

      setSelectedGroups([]);
      await fetchMonitoredGroups();
    } catch (error) {
      console.error('Erro ao adicionar grupos:', error);
      toast({
        title: "Erro",
        description: "Erro ao adicionar grupos ao monitoramento",
        variant: "destructive",
      });
    }
  };

  const removeFromMonitoring = async (groupId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('monitored_whatsapp_groups')
        .delete()
        .eq('user_id', user.id)
        .eq('group_id', groupId);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Grupo removido do monitoramento",
      });

      await fetchMonitoredGroups();
    } catch (error) {
      console.error('Erro ao remover grupo:', error);
      toast({
        title: "Erro",
        description: "Erro ao remover grupo do monitoramento",
        variant: "destructive",
      });
    }
  };

  const filteredGroups = groups.filter(group =>
    group.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredMonitoredGroups = monitoredGroups.filter(group =>
    group.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Controles e Status do Cache */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Buscar grupos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={loadCachedGroups} disabled={isLoading} variant="outline">
            <Users className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Carregar Cache
          </Button>
          <Button onClick={refreshGroupsFromApi} disabled={isRefreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Atualizar da API
          </Button>
          {selectedGroups.length > 0 && (
            <Button onClick={addToMonitoring} className="bg-green-600 hover:bg-green-700">
              <Plus className="h-4 w-4 mr-2" />
              Monitorar ({selectedGroups.length})
            </Button>
          )}
        </div>
      </div>

      {/* Status do Cache */}
      {lastCacheUpdate && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-blue-800">
              <Clock className="h-4 w-4" />
              <span className="text-sm">
                Cache atualizado {formatDistanceToNow(new Date(lastCacheUpdate), { 
                  addSuffix: true, 
                  locale: ptBR 
                })}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Grupos Monitorados */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-green-600" />
            Grupos Monitorados ({filteredMonitoredGroups.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredMonitoredGroups.length > 0 ? (
            <div className="space-y-3">
              {filteredMonitoredGroups.map(group => (
                <div key={group.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Users className="h-4 w-4 text-gray-500" />
                    <span className="font-medium">{group.name}</span>
                    <Badge className="bg-green-100 text-green-800">Monitorado</Badge>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" className="text-red-600">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Remover Monitoramento</AlertDialogTitle>
                        <AlertDialogDescription>
                          Tem certeza que deseja parar de monitorar o grupo "{group.name}"?
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => removeFromMonitoring(group.id)}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          Remover
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Users className="h-12 w-12 mx-auto mb-2 text-gray-300" />
              <p>Nenhum grupo sendo monitorado</p>
              <p className="text-sm">Use o botão "Atualizar da API" para encontrar grupos disponíveis</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Grupos Disponíveis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-600" />
            Grupos Disponíveis ({filteredGroups.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredGroups.length > 0 ? (
            <div className="space-y-3">
              {filteredGroups.map(group => {
                const isAlreadyMonitored = monitoredGroups.some(mg => mg.id === group.id);
                return (
                  <div key={group.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={selectedGroups.includes(group.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedGroups(prev => [...prev, group.id]);
                          } else {
                            setSelectedGroups(prev => prev.filter(id => id !== group.id));
                          }
                        }}
                        disabled={isAlreadyMonitored}
                      />
                      <Users className="h-4 w-4 text-gray-500" />
                      <span className="font-medium">{group.name}</span>
                      <Badge variant="secondary">{group.participants} participantes</Badge>
                      {isAlreadyMonitored && (
                        <Badge className="bg-green-100 text-green-800">Já Monitorado</Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Users className="h-12 w-12 mx-auto mb-2 text-gray-300" />
              <p>Nenhum grupo encontrado</p>
              <p className="text-sm text-gray-400 mt-2">
                {!lastCacheUpdate ? 
                  'Clique em "Atualizar da API" para buscar seus grupos do WhatsApp' :
                  'Use o campo de busca para filtrar grupos ou atualize da API'
                }
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
