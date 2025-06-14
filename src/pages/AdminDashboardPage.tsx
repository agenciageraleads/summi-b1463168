
import { AdminRoute } from '@/components/Admin/AdminRoute';
import { AdminLayout } from '@/components/Admin/AdminLayout';
import { StatsCards } from '@/components/Admin/StatsCards';
import { useAdmin } from '@/hooks/useAdmin';

const AdminDashboardPage = () => {
  const { stats, isLoading } = useAdmin();

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
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Painel Administrativo 🔧
            </h1>
            <p className="text-gray-600">
              Visão geral e estatísticas do sistema
            </p>
          </div>

          {stats && <StatsCards stats={stats} />}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Gráfico de usuários por status de assinatura */}
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Distribuição de Usuários
              </h3>
              {stats && (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Assinantes Ativos</span>
                    <span className="font-semibold text-green-600">
                      {stats.totalSubscribers} ({((stats.totalSubscribers / stats.totalUsers) * 100).toFixed(1)}%)
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Em Trial</span>
                    <span className="font-semibold text-yellow-600">
                      {stats.trialUsers} ({((stats.trialUsers / stats.totalUsers) * 100).toFixed(1)}%)
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Inativos</span>
                    <span className="font-semibold text-gray-600">
                      {stats.totalUsers - stats.totalSubscribers - stats.trialUsers} ({(((stats.totalUsers - stats.totalSubscribers - stats.trialUsers) / stats.totalUsers) * 100).toFixed(1)}%)
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Status de conexão */}
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Status de Conexão
              </h3>
              {stats && (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Conectados</span>
                    <span className="font-semibold text-emerald-600">
                      {stats.connectedUsers} ({((stats.connectedUsers / stats.totalUsers) * 100).toFixed(1)}%)
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Desconectados</span>
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
