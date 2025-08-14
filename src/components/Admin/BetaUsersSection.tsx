
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

interface BetaUsersSectionProps {
  users: AdminUser[];
  onRefresh: () => void;
}

// Componente para gestão de usuários beta
export const BetaUsersSection: React.FC<BetaUsersSectionProps> = ({ users, onRefresh }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});
  const { toast } = useToast();

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

  // Função refatorada para promover usuário com validações completas
  const promoteUserToBeta = async (userId: string, userName: string) => {
    setLoadingStates(prev => ({ ...prev, [userId]: true }));
    
    console.log(`[BETA-REFACTOR] 🚀 Iniciando promoção: ${userName} (${userId})`);
    
    try {
      // ETAPA 1: Validação prévia do usuário
      const { data: currentUser, error: fetchError } = await supabase
        .from('profiles')
        .select('id, nome, role, email')
        .eq('id', userId)
        .single();

      if (fetchError) {
        console.error('[BETA-REFACTOR] ❌ Erro ao buscar usuário:', fetchError);
        throw new Error('Usuário não encontrado no sistema');
      }

      if (currentUser?.role === 'beta') {
        console.warn('[BETA-REFACTOR] ⚠️ Usuário já é beta:', currentUser);
        toast({
          title: "⚠️ Usuário já é beta",
          description: `${userName} já possui acesso às funcionalidades beta.`,
        });
        return;
      }

      console.log('[BETA-REFACTOR] 📋 Dados antes da promoção:', {
        nome: currentUser.nome,
        role: currentUser.role,
        email: currentUser.email
      });

      // ETAPA 2: Atualização do role com log de auditoria
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ role: 'beta' })
        .eq('id', userId);

      if (updateError) {
        console.error('[BETA-REFACTOR] ❌ Erro na atualização:', updateError);
        throw new Error(updateError.message || 'Falha ao atualizar role do usuário');
      }

      // ETAPA 3: Log de auditoria de segurança
      const { error: auditError } = await supabase
        .from('security_audit_log')
        .insert({
          event_type: 'user_promoted_to_beta',
          event_details: {
            target_user_id: userId,
            target_user_name: userName,
            target_user_email: currentUser.email,
            previous_role: currentUser.role,
            new_role: 'beta',
            promotion_timestamp: new Date().toISOString()
          },
          severity: 'high'
        });

      if (auditError) {
        console.warn('[BETA-REFACTOR] ⚠️ Erro no log de auditoria:', auditError);
      } else {
        console.log('[BETA-REFACTOR] 📝 Log de auditoria salvo com sucesso');
      }

      console.log(`[BETA-REFACTOR] ✅ Promoção concluída: ${userName} → BETA`);

      toast({
        title: "✅ Promoção realizada!",
        description: `${userName} agora tem acesso às funcionalidades beta.`,
      });
      
      onRefresh();
    } catch (error: any) {
      console.error('[BETA-REFACTOR] ❌ Erro crítico na promoção:', error);
      toast({
        title: "❌ Erro na promoção",
        description: error.message || 'Falha inesperada ao promover usuário',
        variant: "destructive",
      });
    } finally {
      setLoadingStates(prev => ({ ...prev, [userId]: false }));
    }
  };

  // Função refatorada para remover usuário com validações completas
  const removeUserFromBeta = async (userId: string, userName: string) => {
    setLoadingStates(prev => ({ ...prev, [userId]: true }));
    
    console.log(`[BETA-REFACTOR] 🔄 Iniciando remoção: ${userName} (${userId})`);
    
    try {
      // ETAPA 1: Validação prévia do usuário
      const { data: currentUser, error: fetchError } = await supabase
        .from('profiles')
        .select('id, nome, role, email')
        .eq('id', userId)
        .single();

      if (fetchError) {
        console.error('[BETA-REFACTOR] ❌ Erro ao buscar usuário:', fetchError);
        throw new Error('Usuário não encontrado no sistema');
      }

      if (currentUser?.role !== 'beta') {
        console.warn('[BETA-REFACTOR] ⚠️ Usuário não é beta:', currentUser);
        toast({
          title: "⚠️ Usuário não é beta",
          description: `${userName} não possui acesso beta atualmente.`,
        });
        return;
      }

      console.log('[BETA-REFACTOR] 📋 Dados antes da remoção:', {
        nome: currentUser.nome,
        role: currentUser.role,
        email: currentUser.email
      });

      // ETAPA 2: Atualização do role com log de auditoria
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ role: 'user' })
        .eq('id', userId);

      if (updateError) {
        console.error('[BETA-REFACTOR] ❌ Erro na atualização:', updateError);
        throw new Error(updateError.message || 'Falha ao atualizar role do usuário');
      }

      // ETAPA 3: Log de auditoria de segurança
      const { error: auditError } = await supabase
        .from('security_audit_log')
        .insert({
          event_type: 'user_removed_from_beta',
          event_details: {
            target_user_id: userId,
            target_user_name: userName,
            target_user_email: currentUser.email,
            previous_role: 'beta',
            new_role: 'user',
            removal_timestamp: new Date().toISOString()
          },
          severity: 'high'
        });

      if (auditError) {
        console.warn('[BETA-REFACTOR] ⚠️ Erro no log de auditoria:', auditError);
      } else {
        console.log('[BETA-REFACTOR] 📝 Log de auditoria salvo com sucesso');
      }

      console.log(`[BETA-REFACTOR] ✅ Remoção concluída: ${userName} → USER`);

      toast({
        title: "✅ Remoção realizada!",
        description: `${userName} não tem mais acesso às funcionalidades beta.`,
      });
      
      onRefresh();
    } catch (error: any) {
      console.error('[BETA-REFACTOR] ❌ Erro crítico na remoção:', error);
      toast({
        title: "❌ Erro na remoção",
        description: error.message || 'Falha inesperada ao remover usuário',
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
                  Remover Beta
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Remover do Programa Beta</AlertDialogTitle>
                  <AlertDialogDescription>
                    Tem certeza que deseja remover <strong>{user.nome}</strong> do programa beta? 
                    O usuário perderá acesso às funcionalidades beta.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => removeUserFromBeta(user.id, user.nome)}
                    className="bg-red-600 hover:bg-red-700"
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
                  Promover Beta
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Promover para Beta</AlertDialogTitle>
                  <AlertDialogDescription>
                    Tem certeza que deseja promover <strong>{user.nome}</strong> para usuário beta? 
                    O usuário terá acesso às funcionalidades beta da plataforma.
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
