import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TermsOfService } from '@/components/TermsOfService';
import { SEO } from '@/components/SEO';
import { useTranslation } from 'react-i18next';

const TermsPage = () => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title={t('terms_of_service_title')}
        description={t('terms_of_service_desc')}
        author="Summi"
      />
      <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-foreground mb-8 text-center">{t('terms_of_service_title')}</h1>
        <div className="bg-card p-8 rounded-lg shadow-sm border border-border space-y-6 text-muted-foreground">
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">{t('terms_acceptance_title')}</h2>
            <p>{t('terms_acceptance_text')}</p>
          </section>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8 max-w-4xl bg-white shadow-lg rounded-xl my-8">
        <h1 className="text-3xl font-bold text-summi-gray-900 mb-8 text-center">{t('terms_of_service_title')}</h1>
        <h2 className="sr-only">{t('platform_usage_terms', { defaultValue: 'Termos de Uso da Plataforma' })}</h2>
        <TermsOfService />
      </div>
    </div>
  );
};

export default TermsPage;
