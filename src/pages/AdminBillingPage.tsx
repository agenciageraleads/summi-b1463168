import { AdminRoute } from '@/components/Admin/AdminRoute';
import { AdminLayout } from '@/components/Admin/AdminLayout';
import { BillingDashboard } from '@/components/Admin/BillingDashboard';
import { SEO } from '@/components/SEO';
import { useTranslation } from 'react-i18next';

const AdminBillingPage = () => {
  const { t } = useTranslation();

  return (
    <AdminRoute>
      <AdminLayout>
        <SEO
          title={t('admin_billing_title')}
          description={t('admin_billing_desc')}
          noIndex
          author="Summi"
        />

        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              {t('billing_header')}
            </h1>
            <p className="text-muted-foreground">
              {t('billing_subtitle')}
            </p>
          </div>
          <BillingDashboard />
        </div>
      </AdminLayout>
    </AdminRoute>
  );
};

export default AdminBillingPage;
