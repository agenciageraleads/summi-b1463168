
import React, { useState } from 'react';
import { AdminUser } from '@/hooks/useAdmin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { UserCheck, UserX, Search, TestTube } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAdminAccess } from '@/hooks/useAdminAccess';

interface BetaUsersSectionProps {
  users: AdminUser[];
  onRefresh: () => void;
}

// Componente para gestão de usuários beta
export const BetaUsersSection: React.FC<BetaUsersSectionProps> = ({ users, onRefresh }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});
  const { toast } = useToast();
  const { isAdmin } = useAdminAccess();

  // Filtrar usuários com base no termo de busca
  const filteredUsers = users.filter(user => 
    user.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.numero?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Separar usuários beta dos demais e ordenar alfabeticamente
  const betaUsers = filteredUsers
    .filter(user => user.role === 'beta')
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' }));
    
  const regularUsers = filteredUsers
    .filter(user => user.role === 'user')
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' }));

  // Função segura para chamar a Edge Function de promoção/despromoção
  const callPromoteBeta = async (userId: string, action: 'promote' | 'remove', userName: string) => {
    // Validação de segurança no frontend
    if (!isAdmin) {
      toast({
        title: "❌ Acesso negado",
        description: "Apenas administradores podem gerenciar usuários beta.",
        variant: "destructive",
      });
      return;
    }

    setLoadingStates(prev => ({ ...prev, [userId]: true }));
    
    console.log(`[BETA-SECURE] 🔐 Iniciando ${action}: ${userName} (${userId})`);
    
    try {
      // Obter token de autenticação
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Sessão expirada. Faça login novamente.');
      }

      console.log('[BETA-SECURE] 🎫 Token obtido, chamando Edge Function...');

      // Chamar Edge Function
      const response = await fetch(
        `https://fuhdqxaiewdztzuxriho.supabase.co/functions/v1/promote-user-beta`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ1aGRxeGFpZXdkenR6dXhyaWhvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk2OTQ1NjcsImV4cCI6MjA2NTI3MDU2N30.T3EAHi3ayX_5MG93jr2n6HVXe_CLsEUh_udCfi441mo'
          },
          body: JSON.stringify({ userId, action })
        }
      );

      const json = await response.json();
      
      if (!response.ok) {
        console.error('[BETA-SECURE] ❌ Erro da Edge Function:', {
          status: response.status,
          statusText: response.statusText,
          error: json
        });
        throw new Error(json?.error || `Erro ${response.status}: ${response.statusText}`);
      }

      console.log('[BETA-SECURE] ✅ Sucesso:', json);

      const actionText = action === 'promote' ? 'promovido para' : 'removido do';
      toast({
        title: "✅ Operação realizada!",
        description: json?.message || `${userName} foi ${actionText} beta com sucesso.`,
      });
      
      // Atualizar lista
      onRefresh();
      
    } catch (error: any) {
      console.error('[BETA-SECURE] ❌ Erro crítico:', error);
      toast({
        title: "❌ Erro na operação",
        description: error.message || 'Falha inesperada na operação',
        variant: "destructive",
      });
    } finally {
      setLoadingStates(prev => ({ ...prev, [userId]: false }));
    }
  };

  const UserCard: React.FC<{ user: AdminUser; isBeta: boolean }> = ({ user, isBeta }) => (
    <div className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-medium text-gray-900">{user.nome}</h3>
            {isBeta && <Badge className="bg-purple-100 text-purple-800">BETA</Badge>}
          </div>
          <p className="text-sm text-gray-600">{user.numero || 'Sem número'}</p>
          <p className="text-xs text-gray-500 font-mono">{user.id}</p>
          <p className="text-xs text-gray-500">
            Criado em: {new Date(user.created_at).toLocaleDateString('pt-BR')}
          </p>
        </div>
        
        <div className="flex flex-col gap-2">
          {/* Só mostra botões se for admin */}
          {isAdmin && (
            <>
              {isBeta ? (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={loadingStates[user.id]}
                      className="text-red-600 hover:text-red-700"
                    >
                      <UserX className="h-4 w-4 mr-1" />
                      {loadingStates[user.id] ? 'Removendo...' : 'Remover Beta'}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Remover do Programa Beta</AlertDialogTitle>
                      <AlertDialogDescription>
                        Tem certeza que deseja remover <strong>{user.nome}</strong> do programa beta? 
                        O usuário perderá acesso às funcionalidades beta e webhooks serão atualizados.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => callPromoteBeta(user.id, 'remove', user.nome)}
                        className="bg-red-600 hover:bg-red-700"
                        disabled={loadingStates[user.id]}
                      >
                        Remover do Beta
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              ) : (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={loadingStates[user.id]}
                      className="text-purple-600 hover:text-purple-700"
                    >
                      <UserCheck className="h-4 w-4 mr-1" />
                      {loadingStates[user.id] ? 'Promovendo...' : 'Promover Beta'}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Promover para Beta</AlertDialogTitle>
                      <AlertDialogDescription>
                        Tem certeza que deseja promover <strong>{user.nome}</strong> para usuário beta? 
                        O usuário terá acesso às funcionalidades beta e webhooks serão configurados.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => callPromoteBeta(user.id, 'promote', user.nome)}
                        className="bg-purple-600 hover:bg-purple-700"
                        disabled={loadingStates[user.id]}
                      >
                        Promover para Beta
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </>
          )}
          {/* Mostra status para não-admins */}
          {!isAdmin && (
            <Badge variant="secondary" className="text-xs">
              {isBeta ? 'BETA' : 'USER'}
            </Badge>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Barra de busca */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Buscar usuários por nome, número, email ou ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Usuários Beta */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TestTube className="h-5 w-5 text-purple-600" />
            Usuários Beta ({betaUsers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {betaUsers.length > 0 ? (
            <div className="space-y-3">
              {betaUsers.map(user => (
                <UserCard key={user.id} user={user} isBeta={true} />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <TestTube className="h-12 w-12 mx-auto mb-2 text-gray-300" />
              <p>Nenhum usuário beta encontrado</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Usuários Regulares */}
      <Card>
        <CardHeader>
          <CardTitle>Usuários Regulares ({regularUsers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {regularUsers.length > 0 ? (
            <div className="space-y-3">
              {regularUsers.map(user => (
                <UserCard key={user.id} user={user} isBeta={false} />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>Nenhum usuário regular encontrado</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
