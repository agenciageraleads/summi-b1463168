
import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TermsOfService } from '@/components/TermsOfService';

const TermsPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-summi-green/5 to-summi-secondary/5">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <Link to="/">
            <Button variant="ghost" className="text-summi-green hover:text-summi-secondary">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
          </Link>
        </div>
      </div>

      {/* Content */}
      <TermsOfService />
    </div>
  );
};

export default TermsPage;
