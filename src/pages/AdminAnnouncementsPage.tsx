
import { AdminRoute } from '@/components/Admin/AdminRoute';
import { AdminLayout } from '@/components/Admin/AdminLayout';
import { AnnouncementsManager } from '@/components/Admin/AnnouncementsManager';

const AdminAnnouncementsPage = () => {
  return (
    <AdminRoute>
      <AdminLayout>
        <AnnouncementsManager />
      </AdminLayout>
    </AdminRoute>
  );
};

export default AdminAnnouncementsPage;
