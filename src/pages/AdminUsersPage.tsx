
// ABOUTME: Página de administração de usuários com funcionalidades de gestão completa.
// ABOUTME: Inclui listagem, edição, desconexão e exclusão de usuários.

import { AdminRoute } from '@/components/Admin/AdminRoute';
import { AdminLayout } from '@/components/Admin/AdminLayout';
import { UsersTable } from '@/components/Admin/UsersTable';
import { useAdmin } from '@/hooks/useAdmin';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

const AdminUsersPage = () => {
  const { 
    users, 
    isLoading, 
    fetchUsers, 
    deleteUserAccount, 
    disconnectUser,
    restartUserInstance
  } = useAdmin();

  const handleRefresh = () => {
    fetchUsers();
  };

  if (isLoading) {
    return (
      <AdminRoute>
        <AdminLayout>
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
          </div>
        </AdminLayout>
      </AdminRoute>
    );
  }

  return (
    <AdminRoute>
      <AdminLayout>
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Gestão de Usuários 👥
              </h1>
              <p className="text-gray-600">
                Gerencie contas de usuários, conexões e assinaturas
              </p>
            </div>
            <Button onClick={handleRefresh} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
          </div>

          <UsersTable
            users={users}
            onDeleteUser={deleteUserAccount}
            onDisconnectUser={disconnectUser}
            onRestartInstance={restartUserInstance}
            onRefreshUsers={handleRefresh}
          />
        </div>
      </AdminLayout>
    </AdminRoute>
  );
};

export default AdminUsersPage;
