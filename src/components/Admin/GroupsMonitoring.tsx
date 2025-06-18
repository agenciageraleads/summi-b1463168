
import React, { useState, useEffect } from 'react';
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

// Componente para monitoramento de grupos WhatsApp
export const GroupsMonitoring: React.FC = () => {
  const { user } = useAuth();
  const { profile } = useProfile();
  const { toast } = useToast();
  const [groups, setGroups] = useState<WhatsAppGroup[]>([]);
  const [monitoredGroups, setMonitoredGroups] = useState<WhatsAppGroup[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);

  // Buscar grupos do WhatsApp - funciona para qualquer usuário logado
  const fetchWhatsAppGroups = async () => {
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
        setGroups(data.groups || []);
        console.log(`[GroupsMonitoring] ${data.groups?.length || 0} grupos encontrados`);
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
  };

  // Buscar grupos monitorados do usuário
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

  // Adicionar grupos ao monitoramento
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

  // Remover grupo do monitoramento
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

  // Carregar dados iniciais
  useEffect(() => {
    if (user) {
      fetchMonitoredGroups();
    }
  }, [user]);

  // Filtrar grupos com base na busca
  const filteredGroups = groups.filter(group =>
    group.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredMonitoredGroups = monitoredGroups.filter(group =>
    group.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Controles */}
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
          <Button onClick={fetchWhatsAppGroups} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Buscar Grupos
          </Button>
          {selectedGroups.length > 0 && (
            <Button onClick={addToMonitoring} className="bg-green-600 hover:bg-green-700">
              <Plus className="h-4 w-4 mr-2" />
              Monitorar ({selectedGroups.length})
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
              <p className="text-sm">Use o botão "Buscar Grupos" para encontrar grupos disponíveis</p>
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
