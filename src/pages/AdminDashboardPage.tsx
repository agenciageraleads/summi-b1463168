import { AdminRoute } from '@/components/Admin/AdminRoute';
import { AdminLayout } from '@/components/Admin/AdminLayout';
import { StatsCards } from '@/components/Admin/StatsCards';
import { useAdmin } from '@/hooks/useAdmin';
import { SEO } from '@/components/SEO';
import { useTranslation } from 'react-i18next';

const AdminDashboardPage = () => {
  const { t } = useTranslation();
  const { stats, isLoading } = useAdmin();

  if (isLoading) {
    return (
      <AdminRoute>
        <AdminLayout>
          <SEO title="Carregando..." description="Aguarde..." noIndex />
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
        <SEO
          title={t('admin_title')}
          description={t('admin_subtitle')}
          noIndex
        />
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {t('admin_title')}
            </h1>
            <p className="text-gray-600">
              {t('admin_subtitle')}
            </p>
          </div>

          {stats && <StatsCards stats={stats} />}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Gráfico de usuários por status de assinatura */}
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                {t('user_distribution')}
              </h2>
              {stats && (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">{t('active_subscribers')}</span>
                    <span className="font-semibold text-green-600">
                      {stats.totalSubscribers} ({((stats.totalSubscribers / stats.totalUsers) * 100).toFixed(1)}%)
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">{t('trial_users')}</span>
                    <span className="font-semibold text-yellow-600">
                      {stats.trialUsers} ({((stats.trialUsers / stats.totalUsers) * 100).toFixed(1)}%)
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">{t('inactive_users')}</span>
                    <span className="font-semibold text-gray-600">
                      {stats.totalUsers - stats.totalSubscribers - stats.trialUsers} ({(((stats.totalUsers - stats.totalSubscribers - stats.trialUsers) / stats.totalUsers) * 100).toFixed(1)}%)
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Status de conexão */}
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                {t('connection_status')}
              </h2>
              {stats && (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">{t('connected')}</span>
                    <span className="font-semibold text-emerald-600">
                      {stats.connectedUsers} ({((stats.connectedUsers / stats.totalUsers) * 100).toFixed(1)}%)
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">{t('disconnected')}</span>
                    <span className="font-semibold text-red-600">
                      {stats.disconnectedUsers} ({((stats.disconnectedUsers / stats.totalUsers) * 100).toFixed(1)}%)
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </AdminLayout>
    </AdminRoute>
  );
};
export default AdminDashboardPage;
