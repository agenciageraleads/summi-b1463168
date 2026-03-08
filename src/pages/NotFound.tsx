import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { SEO } from "@/components/SEO";

const NotFound = () => {
  const { t } = useTranslation();
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F5F7F6]">
      <SEO
        title="404 - Not Found"
        description="Page not found"
        author="Summi"
      />
      <div className="text-center p-8 bg-white rounded-2xl shadow-sm border border-[#E9EDEB]">
        <h1 className="text-6xl font-bold mb-4 text-[#1A1C1B]">404</h1>
        <p className="text-xl text-[#4A4D4C] mb-8">{t('page_not_found')}</p>
        <Link to="/" className="inline-flex items-center justify-center px-6 h-11 rounded-lg bg-[#00A36C] text-white font-bold hover:bg-[#008F5D] transition-colors">
          {t('back_to_home')}
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
