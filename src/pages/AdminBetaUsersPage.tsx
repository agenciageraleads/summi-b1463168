
import React from 'react';
import { AdminRoute } from '@/components/Admin/AdminRoute';
import { AdminLayout } from '@/components/Admin/AdminLayout';
import { BetaUsersSection } from '@/components/Admin/BetaUsersSection';
import { useAdmin } from '@/hooks/useAdmin';
import { Button } from '@/components/ui/button';
import { RefreshCw, TestTube } from 'lucide-react';

// Página dedicada para gestão de usuários beta
const AdminBetaUsersPage: React.FC = () => {
  const { users, isLoading, fetchUsers } = useAdmin();

  const handleRefresh = () => {
    fetchUsers();
  };

  if (isLoading) {
    return (
      <AdminRoute>
        <AdminLayout>
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
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
              <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-2">
                <TestTube className="h-8 w-8 text-purple-600" />
                Usuários Beta 🧪
              </h1>
              <p className="text-gray-600">
                Gerencie usuários do programa beta e suas permissões
              </p>
            </div>
            <Button onClick={handleRefresh} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
          </div>

          <BetaUsersSection users={users} onRefresh={handleRefresh} />
        </div>
      </AdminLayout>
    </AdminRoute>
  );
};

export default AdminBetaUsersPage;
