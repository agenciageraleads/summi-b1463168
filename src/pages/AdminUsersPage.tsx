import { AdminRoute } from '@/components/Admin/AdminRoute';
import { AdminLayout } from '@/components/Admin/AdminLayout';
import { UsersTable } from '@/components/Admin/UsersTable';
import { useAdmin } from '@/hooks/useAdmin';
import { Button } from '@/components/ui/button';
import { RefreshCw, ShieldAlert } from 'lucide-react';
import { SEO } from '@/components/SEO';
import { useTranslation } from 'react-i18next';

const AdminUsersPage = () => {
  const { t } = useTranslation();
  const {
    users,
    isLoading,
    fetchUsers,
    deleteUserAccount,
    disconnectUser,
    restartUserInstance,
    cleanupExtraAdmins
  } = useAdmin();

  const handleRefresh = () => {
    fetchUsers();
  };

  if (isLoading) {
    return (
      <AdminRoute>
        <AdminLayout>
          <div className="flex items-center justify-center min-h-[400px]">
            <SEO
              title={t('loading')}
              description={t('please_wait')}
              author="Summi"
              noIndex
            />
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
          </div>
        </AdminLayout>
      </AdminRoute>
    );
  }

  return (
    <AdminRoute>
      <AdminLayout>
        <SEO
          title={t('admin_users_title')}
          description={t('admin_users_subtitle')}
          author="Summi"
          noIndex
        />
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {t('admin_users_title')} 👥
              </h1>
              <h2 className="text-gray-600 font-normal text-lg">
                {t('admin_users_subtitle')}
              </h2>
            </div>
            <div className="flex gap-2">
              <Button onClick={cleanupExtraAdmins} variant="outline" className="text-red-600 hover:text-red-700">
                <ShieldAlert className="h-4 w-4 mr-2" />
                {t('cleanup_extra_admins')}
              </Button>
              <Button onClick={handleRefresh} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                {t('refresh')}
              </Button>
            </div>
          </div>

          <h2 className="sr-only">{t('user_list')}</h2>
          <UsersTable
            users={users}
            onDeleteUser={deleteUserAccount}
            onDisconnectUser={disconnectUser}
            onRestartInstance={restartUserInstance}
          />
        </div>
      </AdminLayout>
    </AdminRoute>
  );
};

export default AdminUsersPage;
