import React from 'react';
import { AdminRoute } from '@/components/Admin/AdminRoute';
import { AdminLayout } from '@/components/Admin/AdminLayout';
import { BetaUsersSection } from '@/components/Admin/BetaUsersSection';
import { useAdmin } from '@/hooks/useAdmin';
import { useAdminAccess } from '@/hooks/useAdminAccess';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { RefreshCw, TestTube, Shield, AlertTriangle } from 'lucide-react';
import { SEO } from '@/components/SEO';
import { useTranslation } from 'react-i18next';

// Página refatorada para gestão de usuários beta com validação completa
const AdminBetaUsersPage: React.FC = () => {
  const { t } = useTranslation();
  const { users, isLoading, fetchUsers } = useAdmin();
  const {
    isAdmin,
    isLoading: isValidating,
    error: validationError,
    userRole,
    refresh: refreshValidation
  } = useAdminAccess();

  const handleRefresh = () => {
    console.log('[ADMIN-BETA-PAGE] 🔄 Atualizando dados...');
    fetchUsers();
    refreshValidation();
  };

  if (isLoading || isValidating) {
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
            <span className="ml-3 text-muted-foreground">
              {isValidating ? t('validating_permissions') : t('loading_users')}
            </span>
          </div>
        </AdminLayout>
      </AdminRoute>
    );
  }

  // Exibir erro de validação se existir
  if (validationError || !isAdmin) {
    return (
      <AdminRoute>
        <AdminLayout>
          <div className="flex items-center justify-center min-h-[400px]">
            <SEO
              title={t('access_denied')}
              description={t('no_admin_permissions')}
              author="Summi"
              noIndex
            />
            <Card className="max-w-md">
              <CardContent className="pt-6">
                <div className="text-center space-y-4">
                  <AlertTriangle className="h-12 w-12 text-destructive mx-auto" />
                  <div>
                    <h2 className="text-lg font-semibold">{t('access_denied')}</h2>
                    <p className="text-sm text-muted-foreground mt-2">
                      {validationError || t('no_admin_permissions')}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {t('current_role')}: {userRole || t('not_identified')}
                    </p>
                  </div>
                  <Button onClick={refreshValidation} variant="outline" size="sm">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    {t('try_again')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </AdminLayout>
      </AdminRoute>
    );
  }

  return (
    <AdminRoute>
      <AdminLayout>
        <SEO
          title={t('admin_beta_users_title')}
          description={t('admin_beta_users_subtitle')}
          author="Summi"
          noIndex
        />
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-2">
                <TestTube className="h-8 w-8 text-primary" />
                {t('admin_beta_users_title')} 🧪
              </h1>
              <h2 className="text-muted-foreground font-normal text-lg">
                {t('admin_beta_users_subtitle')}
              </h2>
              <div className="flex items-center gap-2 mt-2">
                <Shield className="h-4 w-4 text-green-600" />
                <h2 className="text-xs text-muted-foreground font-normal">
                  {t('admin_confirmed')} • Role: {userRole} • {t('permissions_ok')}
                </h2>
              </div>
            </div>
            <Button onClick={handleRefresh} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              {t('refresh')}
            </Button>
          </div>
          <h2 className="sr-only">{t('beta_testers_list')}</h2>
          <BetaUsersSection users={users} onRefresh={handleRefresh} />
        </div>
      </AdminLayout>
    </AdminRoute>
  );
};

export default AdminBetaUsersPage;
