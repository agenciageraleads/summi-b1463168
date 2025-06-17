
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Search, UserPlus, Crown, TestTube, User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { AdminUser } from '@/hooks/useAdmin';

interface BetaUsersSectionProps {
  users: AdminUser[];
  onRefresh: () => void;
}

export const BetaUsersSection: React.FC<BetaUsersSectionProps> = ({ users, onRefresh }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  
  // Função para promover usuário para beta
  const promoteUserToBeta = async (userId: string, userName: string) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: 'beta' })
        .eq('id', userId);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: `${userName} foi promovido para usuário beta`,
      });
      onRefresh();
    } catch (error) {
      console.error('Erro ao promover usuário:', error);
      toast({
        title: "Erro",
        description: "Erro ao promover usuário para beta",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Função para remover usuário do beta
  const removeUserFromBeta = async (userId: string, userName: string) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: 'user' })
        .eq('id', userId);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: `${userName} foi removido do programa beta`,
      });
      onRefresh();
    } catch (error) {
      console.error('Erro ao remover usuário do beta:', error);
      toast({
        title: "Erro",
        description: "Erro ao remover usuário do beta",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Filtrar usuários baseado na pesquisa e filtro de role
  const filteredUsers = users.filter(user => {
    const matchesSearch = user.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.id.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    
    return matchesSearch && matchesRole;
  });

  // Contar usuários por role
  const userCounts = {
    total: users.length,
    beta: users.filter(u => u.role === 'beta').length,
    admin: users.filter(u => u.role === 'admin').length,
    user: users.filter(u => u.role === 'user').length,
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return <Badge className="bg-red-100 text-red-800"><Crown className="h-3 w-3 mr-1" />Admin</Badge>;
      case 'beta':
        return <Badge className="bg-purple-100 text-purple-800"><TestTube className="h-3 w-3 mr-1" />Beta</Badge>;
      default:
        return <Badge variant="secondary"><User className="h-3 w-3 mr-1" />Usuário</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Estatísticas dos Usuários Beta */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total de Usuários</p>
                <p className="text-2xl font-bold text-gray-900">{userCounts.total}</p>
              </div>
              <User className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Usuários Beta</p>
                <p className="text-2xl font-bold text-purple-600">{userCounts.beta}</p>
              </div>
              <TestTube className="h-8 w-8 text-purple-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Administradores</p>
                <p className="text-2xl font-bold text-red-600">{userCounts.admin}</p>
              </div>
              <Crown className="h-8 w-8 text-red-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Usuários Normais</p>
                <p className="text-2xl font-bold text-blue-600">{userCounts.user}</p>
              </div>
              <User className="h-8 w-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Seção de Gestão de Usuários Beta */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TestTube className="h-5 w-5 text-purple-600" />
            Gestão de Usuários Beta
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Filtros */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1">
              <Label htmlFor="search">Buscar usuários</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="search"
                  placeholder="Nome, email ou ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="min-w-[200px]">
              <Label htmlFor="role-filter">Filtrar por role</Label>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os roles</SelectItem>
                  <SelectItem value="user">Usuários</SelectItem>
                  <SelectItem value="beta">Beta</SelectItem>
                  <SelectItem value="admin">Administradores</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Lista de Usuários */}
          <div className="space-y-3">
            {filteredUsers.map((user) => (
              <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="font-medium text-gray-900">{user.nome}</p>
                      <p className="text-sm text-gray-500">{user.email}</p>
                      <p className="text-xs text-gray-400 font-mono">{user.id}</p>
                    </div>
                    <div className="ml-4">
                      {getRoleBadge(user.role)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Ações baseadas no role atual */}
                  {user.role === 'user' && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm"
                          disabled={loading}
                          className="text-purple-600 hover:text-purple-700"
                        >
                          <UserPlus className="h-4 w-4 mr-1" />
                          Promover para Beta
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Promover para Beta</AlertDialogTitle>
                          <AlertDialogDescription>
                            Tem certeza que deseja promover <strong>{user.nome}</strong> para usuário beta? 
                            Isso dará acesso às funcionalidades beta do sistema.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => promoteUserToBeta(user.id, user.nome)}
                            className="bg-purple-600 hover:bg-purple-700"
                          >
                            Promover para Beta
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}

                  {user.role === 'beta' && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm"
                          disabled={loading}
                          className="text-orange-600 hover:text-orange-700"
                        >
                          Remover do Beta
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remover do Beta</AlertDialogTitle>
                          <AlertDialogDescription>
                            Tem certeza que deseja remover <strong>{user.nome}</strong> do programa beta? 
                            Isso removerá o acesso às funcionalidades beta.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => removeUserFromBeta(user.id, user.nome)}
                            className="bg-orange-600 hover:bg-orange-700"
                          >
                            Remover do Beta
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}

                  {user.role === 'admin' && (
                    <Badge variant="secondary" className="cursor-not-allowed">
                      Administrador
                    </Badge>
                  )}
                </div>
              </div>
            ))}

            {filteredUsers.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                Nenhum usuário encontrado com os filtros aplicados
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
