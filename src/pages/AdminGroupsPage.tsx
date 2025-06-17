
import React from 'react';
import { AdminRoute } from '@/components/Admin/AdminRoute';
import { AdminLayout } from '@/components/Admin/AdminLayout';
import { GroupsMonitoring } from '@/components/Admin/GroupsMonitoring';

const AdminGroupsPage: React.FC = () => {
  return (
    <AdminRoute>
      <AdminLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Monitoramento de Grupos 🚀
            </h1>
            <p className="text-gray-600">
              Funcionalidade beta para monitoramento de grupos WhatsApp
            </p>
          </div>

          <GroupsMonitoring />
        </div>
      </AdminLayout>
    </AdminRoute>
  );
};

export default AdminGroupsPage;
