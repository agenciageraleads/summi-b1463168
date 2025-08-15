
import { useState, useMemo } from 'react';
import { AdminUser } from '@/hooks/useAdmin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Trash2, WifiOff, RotateCcw, Search } from 'lucide-react';

interface UsersTableProps {
  users: AdminUser[];
  onDeleteUser: (userId: string) => Promise<boolean>;
  onDisconnectUser: (userId: string) => Promise<boolean>;
  onRestartInstance?: (userId: string, instanceName: string) => Promise<boolean>;
}

export const UsersTable: React.FC<UsersTableProps> = ({ 
  users, 
  onDeleteUser, 
  onDisconnectUser,
  onRestartInstance
}) => {
  const [loadingStates, setLoadingStates] = useState<Record<string, string>>({});
  const [searchTerm, setSearchTerm] = useState('');

  const handleAction = async (userId: string, action: string, actionFn: () => Promise<boolean>) => {
    setLoadingStates(prev => ({ ...prev, [userId]: action }));
    try {
      await actionFn();
    } finally {
      setLoadingStates(prev => ({ ...prev, [userId]: '' }));
    }
  };

  const getStatusBadge = (user: AdminUser) => {
    if (user.subscription_status === 'active') {
      return <Badge className="bg-green-100 text-green-800">Ativo</Badge>;
    }
    if (user.subscription_status === 'trialing') {
      return <Badge className="bg-yellow-100 text-yellow-800">Trial</Badge>;
    }
    return <Badge variant="secondary">Inativo</Badge>;
  };

  const getConnectionBadge = (status: string) => {
    if (status === 'connected') {
      return <Badge className="bg-emerald-100 text-emerald-800">Conectado</Badge>;
    }
    if (status === 'disconnected') {
      return <Badge className="bg-red-100 text-red-800">Desconectado</Badge>;
    }
    return <Badge className="bg-gray-100 text-gray-800">Verificando...</Badge>;
  };

  // Filtrar e ordenar usuários
  const filteredAndSortedUsers = useMemo(() => {
    return users
      .filter(user => {
        const searchLower = searchTerm.toLowerCase();
        return (
          user.nome.toLowerCase().includes(searchLower) ||
          (user.numero && user.numero.includes(searchTerm)) ||
          (user.email && user.email.toLowerCase().includes(searchLower)) ||
          user.id.toLowerCase().includes(searchLower)
        );
      })
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' }));
  }, [users, searchTerm]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Gestão de Usuários</span>
          <span className="text-sm font-normal text-gray-600">
            {filteredAndSortedUsers.length} de {users.length} usuários
          </span>
        </CardTitle>
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Buscar por nome, número, email ou ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-medium text-gray-600">Nome</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Número</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Role</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Assinatura</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Conexão</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Instância</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Criado em</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredAndSortedUsers.map((user) => (
                <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4">
                    <div>
                      <div className="font-medium text-gray-900">{user.nome}</div>
                      <div className="text-sm text-gray-500 truncate max-w-[200px]" title={user.id}>
                        ID: {user.id}
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-gray-700">
                    {user.numero || '-'}
                  </td>
                  <td className="py-3 px-4">
                    <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                      {user.role}
                    </Badge>
                  </td>
                  <td className="py-3 px-4">
                    {getStatusBadge(user)}
                  </td>
                  <td className="py-3 px-4">
                    {getConnectionBadge(user.connectionStatus || 'unknown')}
                  </td>
                  <td className="py-3 px-4 text-gray-700">
                    <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">
                      {user.instance_name || 'Nenhuma'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-gray-700">
                    {new Date(user.created_at).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex space-x-2">
                      {/* Reiniciar instância */}
                      {user.instance_name && onRestartInstance && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={loadingStates[user.id] === 'restart'}
                              className="text-blue-600 hover:text-blue-700"
                            >
                              <RotateCcw className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Reiniciar Instância</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza que deseja reiniciar a instância <strong>{user.instance_name}</strong> do usuário <strong>{user.nome}</strong>? 
                                Isso pode interromper temporariamente a conexão WhatsApp.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleAction(
                                  user.id, 
                                  'restart', 
                                  () => onRestartInstance(user.id, user.instance_name!)
                                )}
                                className="bg-blue-600 hover:bg-blue-700"
                              >
                                Reiniciar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}

                      {/* Desconectar usuário */}
                      {user.connectionStatus === 'connected' && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={loadingStates[user.id] === 'disconnect'}
                            >
                              <WifiOff className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Desconectar Usuário</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza que deseja desconectar o usuário <strong>{user.nome}</strong>? 
                                Isso irá limpar a instância WhatsApp dele.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleAction(
                                  user.id, 
                                  'disconnect', 
                                  () => onDisconnectUser(user.id)
                                )}
                              >
                                Desconectar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}

                      {/* Deletar usuário */}
                      {user.role !== 'admin' && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="destructive"
                              size="sm"
                              disabled={loadingStates[user.id] === 'delete'}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Deletar Conta</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza que deseja deletar permanentemente a conta do usuário <strong>{user.nome}</strong>? 
                                Esta ação não pode ser desfeita e irá remover todos os dados do usuário.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleAction(
                                  user.id, 
                                  'delete', 
                                  () => onDeleteUser(user.id)
                                )}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Deletar Permanentemente
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {filteredAndSortedUsers.length === 0 && users.length > 0 && (
            <div className="text-center py-8 text-gray-500">
              Nenhum usuário encontrado para "{searchTerm}"
            </div>
          )}
          
          {users.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              Nenhum usuário encontrado
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
