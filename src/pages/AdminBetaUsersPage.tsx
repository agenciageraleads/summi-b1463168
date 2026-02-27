
import React from 'react';
import { AdminRoute } from '@/components/Admin/AdminRoute';
import { AdminLayout } from '@/components/Admin/AdminLayout';
import { BetaUsersSection } from '@/components/Admin/BetaUsersSection';
import { useAdmin } from '@/hooks/useAdmin';
import { useAdminAccess } from '@/hooks/useAdminAccess';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { RefreshCw, TestTube, Shield, AlertTriangle } from 'lucide-react';

// Página refatorada para gestão de usuários beta com validação completa
const AdminBetaUsersPage: React.FC = () => {
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
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
            <span className="ml-3 text-muted-foreground">
              {isValidating ? 'Validando permissões...' : 'Carregando usuários...'}
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
            <Card className="max-w-md">
              <CardContent className="pt-6">
                <div className="text-center space-y-4">
                  <AlertTriangle className="h-12 w-12 text-destructive mx-auto" />
                  <div>
                    <h3 className="text-lg font-semibold">Acesso Negado</h3>
                    <p className="text-sm text-muted-foreground mt-2">
                      {validationError || 'Você não tem permissões de administrador para acessar esta página.'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Role atual: {userRole || 'Não identificado'}
                    </p>
                  </div>
                  <Button onClick={refreshValidation} variant="outline" size="sm">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Tentar Novamente
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
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-2">
                <TestTube className="h-8 w-8 text-primary" />
                Usuários Beta 🧪
              </h1>
              <p className="text-muted-foreground">
                Gerencie usuários do programa beta e suas permissões
              </p>
              <div className="flex items-center gap-2 mt-2">
                <Shield className="h-4 w-4 text-green-600" />
                <span className="text-xs text-muted-foreground">
                  Admin confirmado • Role: {userRole} • Permissões: ✅
                </span>
              </div>
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
