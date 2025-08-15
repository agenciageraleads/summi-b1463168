
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { RefreshCw, Search, Users, Trash2, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';

interface WhatsAppGroup {
  id: string;
  name: string;
  participants: number;
  isMonitored: boolean;
}

interface CachedGroup {
  group_id: string;
  group_name: string;
  participants_count: number;
  last_updated: string;
}

// Componente para monitoramento de grupos WhatsApp - BETA FEATURE
export const GroupsMonitoring: React.FC = () => {
  const { user } = useAuth();
  const { profile } = useProfile();
  const { toast } = useToast();
  const [groups, setGroups] = useState<WhatsAppGroup[]>([]);
  const [monitoredGroups, setMonitoredGroups] = useState<WhatsAppGroup[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingCache, setIsLoadingCache] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [isAddingGroups, setIsAddingGroups] = useState(false);
  const [cacheTimestamp, setCacheTimestamp] = useState<Date | null>(null);

  // Cache management functions
  const getCacheKey = useCallback(() => {
    return `whatsapp_groups_${user?.id}_${profile?.instance_name}`;
  }, [user?.id, profile?.instance_name]);

  // Load groups from cache first, then from server if cache is old
  const loadGroupsWithCache = useCallback(async () => {
    if (!user || !profile?.instance_name) return;

    setIsLoadingCache(true);
    try {
      // Try to load from cache first
      const { data: cachedGroups } = await supabase
        .from('whatsapp_groups_cache')
        .select('*')
        .eq('user_id', user.id)
        .gte('last_updated', new Date(Date.now() - 5 * 60 * 1000).toISOString()); // 5 minutos de cache

      if (cachedGroups && cachedGroups.length > 0) {
        console.log(`[GroupsMonitoring] Cache encontrado: ${cachedGroups.length} grupos`);
        const formattedGroups = cachedGroups.map(cached => ({
          id: cached.group_id,
          name: cached.group_name,
          participants: cached.participants_count,
          isMonitored: false
        }));
        setGroups(formattedGroups);
        setCacheTimestamp(new Date(cachedGroups[0].last_updated));
        return true; // Cache found and loaded
      }
    } catch (error) {
      console.error('[GroupsMonitoring] Erro ao carregar cache:', error);
    } finally {
      setIsLoadingCache(false);
    }
    return false; // No cache found
  }, [user, profile?.instance_name]);

  // Save groups to cache
  const saveGroupsToCache = useCallback(async (groupsToCache: WhatsAppGroup[]) => {
    if (!user) return;

    try {
      // Clear old cache
      await supabase
        .from('whatsapp_groups_cache')
        .delete()
        .eq('user_id', user.id);

      // Save new cache
      const cacheData = groupsToCache.map(group => ({
        user_id: user.id,
        group_id: group.id,
        group_name: group.name,
        participants_count: group.participants
      }));

      const { error } = await supabase
        .from('whatsapp_groups_cache')
        .insert(cacheData);

      if (error) {
        console.error('[GroupsMonitoring] Erro ao salvar cache:', error);
      } else {
        console.log(`[GroupsMonitoring] Cache salvo: ${cacheData.length} grupos`);
        setCacheTimestamp(new Date());
      }
    } catch (error) {
      console.error('[GroupsMonitoring] Erro ao salvar cache:', error);
    }
  }, [user]);

  // Buscar grupos automaticamente quando o componente carrega
  useEffect(() => {
    if (user && profile?.instance_name) {
      const initializeGroups = async () => {
        const cacheLoaded = await loadGroupsWithCache();
        
        // Load monitored groups always
        await fetchMonitoredGroups();
        
        // If no cache or cache is old, refresh from API
        if (!cacheLoaded) {
          await fetchWhatsAppGroups();
        }
      };
      
      initializeGroups();
    }
  }, [user, profile?.instance_name, loadGroupsWithCache]);

  // Buscar grupos do WhatsApp (força refresh da API)
  const fetchWhatsAppGroups = useCallback(async () => {
    if (!user || !profile?.instance_name) {
      toast({
        title: "Aviso",
        description: "Você precisa estar conectado ao WhatsApp para ver os grupos",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      console.log(`[GroupsMonitoring] Buscando grupos para usuário: ${profile.nome} (${profile.instance_name})`);
      
      const { data, error } = await supabase.functions.invoke('fetch-whatsapp-groups', {
        body: { 
          instanceName: profile.instance_name,
          userId: user.id 
        },
      });

      if (error) throw error;

      if (data.success) {
        const newGroups = data.groups || [];
        setGroups(newGroups);
        
        // Save to cache
        await saveGroupsToCache(newGroups);
        
        console.log(`[GroupsMonitoring] ${newGroups.length} grupos encontrados e salvos em cache`);
        toast({
          title: "Grupos atualizados",
          description: `${newGroups.length} grupos encontrados`,
        });
      } else {
        throw new Error(data.error || 'Erro ao buscar grupos');
      }
    } catch (error) {
      console.error('Erro ao buscar grupos:', error);
      toast({
        title: "Erro",
        description: "Erro ao buscar grupos do WhatsApp",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [user, profile, toast, saveGroupsToCache]);

  // Buscar grupos monitorados do usuário
  const fetchMonitoredGroups = useCallback(async () => {
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
      console.log(`[GroupsMonitoring] ${monitored.length} grupos monitorados carregados`);
    } catch (error) {
      console.error('Erro ao buscar grupos monitorados:', error);
      toast({
        title: "Erro",
        description: "Erro ao buscar grupos monitorados",
        variant: "destructive",
      });
    }
  }, [user, toast]);

  // Adicionar grupos ao monitoramento (um por vez)
  const addToMonitoring = async () => {
    if (!user || selectedGroups.length === 0) return;

    setIsAddingGroups(true);
    try {
      const groupsToAdd = groups.filter(g => selectedGroups.includes(g.id));
      let successCount = 0;
      let errorCount = 0;

      // Processar grupos um por vez
      for (const group of groupsToAdd) {
        try {
          console.log(`[GroupsMonitoring] Adicionando grupo: ${group.name} (${group.id})`);
          
          const { data, error } = await supabase.functions.invoke('update-monitored-groups', {
            body: {
              userId: user.id,
              groupId: group.id,
              groupName: group.name,
              action: 'add'
            },
          });

          if (error) {
            console.error(`[GroupsMonitoring] Erro ao adicionar grupo ${group.name}:`, error);
            errorCount++;
          } else if (data?.success) {
            console.log(`[GroupsMonitoring] Grupo ${group.name} adicionado com sucesso`);
            successCount++;
          } else {
            console.error(`[GroupsMonitoring] Falha ao adicionar grupo ${group.name}:`, data?.error);
            errorCount++;
          }
        } catch (error) {
          console.error(`[GroupsMonitoring] Erro inesperado ao adicionar grupo ${group.name}:`, error);
          errorCount++;
        }
      }

      // Feedback para o usuário
      if (successCount > 0) {
        toast({
          title: "Sucesso",
          description: `${successCount} grupo(s) adicionado(s) ao monitoramento`,
        });
      }

      if (errorCount > 0) {
        toast({
          title: "Atenção",
          description: `${errorCount} grupo(s) não puderam ser adicionados. Verifique se já estão sendo monitorados ou se atingiu o limite.`,
          variant: "destructive",
        });
      }

      setSelectedGroups([]);
      await fetchMonitoredGroups();
    } catch (error) {
      console.error('Erro ao adicionar grupos:', error);
      toast({
        title: "Erro",
        description: "Erro inesperado ao adicionar grupos ao monitoramento",
        variant: "destructive",
      });
    } finally {
      setIsAddingGroups(false);
    }
  };

  // Remover grupo do monitoramento
  const removeFromMonitoring = async (groupId: string) => {
    if (!user) return;

    try {
      console.log(`[GroupsMonitoring] Removendo grupo: ${groupId}`);
      
      const { data, error } = await supabase.functions.invoke('update-monitored-groups', {
        body: {
          userId: user.id,
          groupId: groupId,
          action: 'remove'
        },
      });

      if (error) {
        console.error('[GroupsMonitoring] Erro ao remover grupo:', error);
        throw error;
      }

      if (data?.success) {
        console.log('[GroupsMonitoring] Grupo removido com sucesso');
        toast({
          title: "Sucesso",
          description: "Grupo removido do monitoramento",
        });
        await fetchMonitoredGroups();
      } else {
        throw new Error(data?.error || 'Erro ao remover grupo');
      }
    } catch (error) {
      console.error('Erro ao remover grupo:', error);
      toast({
        title: "Erro",
        description: "Erro ao remover grupo do monitoramento",
        variant: "destructive",
      });
    }
  };

  // Filtrar grupos com base na busca (memoized for performance)
  const filteredGroups = useMemo(() => 
    groups.filter(group =>
      group.name.toLowerCase().includes(searchTerm.toLowerCase())
    ), [groups, searchTerm]
  );

  const filteredMonitoredGroups = useMemo(() => 
    monitoredGroups.filter(group =>
      group.name.toLowerCase().includes(searchTerm.toLowerCase())
    ), [monitoredGroups, searchTerm]
  );

  // Cache status information
  const cacheInfo = useMemo(() => {
    if (!cacheTimestamp) return null;
    const age = Math.floor((Date.now() - cacheTimestamp.getTime()) / 1000 / 60); // minutes
    return { age, isOld: age > 5 };
  }, [cacheTimestamp]);

  return (
    <div className="space-y-6">
      {/* Controles de busca e ações */}
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
          <Button onClick={fetchWhatsAppGroups} disabled={isLoading || isLoadingCache}>
            <RefreshCw className={`h-4 w-4 mr-2 ${(isLoading || isLoadingCache) ? 'animate-spin' : ''}`} />
            {isLoading ? 'Atualizando...' : isLoadingCache ? 'Carregando...' : 'Atualizar Grupos'}
          </Button>
          {cacheInfo && (
            <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-md text-sm">
              <span className={`h-2 w-2 rounded-full ${cacheInfo.isOld ? 'bg-orange-500' : 'bg-green-500'}`} />
              Cache: {cacheInfo.age}min atrás
            </div>
          )}
          {selectedGroups.length > 0 && (
            <Button 
              onClick={addToMonitoring} 
              disabled={isAddingGroups}
              className="bg-green-600 hover:bg-green-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              {isAddingGroups ? 'Adicionando...' : `Monitorar (${selectedGroups.length})`}
            </Button>
          )}
        </div>
      </div>

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
              <p className="text-sm">Use o botão "Atualizar Grupos" para encontrar grupos disponíveis</p>
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
              {!profile?.instance_name && (
                <p className="text-sm text-red-500 mt-2">
                  Conecte-se ao WhatsApp primeiro para ver seus grupos
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
