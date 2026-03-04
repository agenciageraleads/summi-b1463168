import { AdminRoute } from '@/components/Admin/AdminRoute';
import { AdminLayout } from '@/components/Admin/AdminLayout';
import { BillingDashboard } from '@/components/Admin/BillingDashboard';

const AdminBillingPage = () => (
  <AdminRoute>
    <AdminLayout>
      <BillingDashboard />
    </AdminLayout>
  </AdminRoute>
);

export default AdminBillingPage;
