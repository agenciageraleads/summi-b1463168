import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';
import { TermsCheckbox } from '@/components/TermsCheckbox';
import { SEO } from '@/components/SEO';
import { useTranslation } from 'react-i18next';

const RegisterPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { register, user, isLoading } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (user && !isLoading) {
      navigate('/dashboard');
    }
  }, [user, isLoading, navigate]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (formData.name.trim().length < 2) {
      newErrors.name = t('name_error', { defaultValue: 'Nome deve ter pelo menos 2 caracteres' });
    }

    if (!formData.email.includes('@')) {
      newErrors.email = t('email_error', { defaultValue: 'E-mail inválido' });
    }

    if (formData.password.length < 6) {
      newErrors.password = t('password_error', { defaultValue: 'Senha deve ter pelo menos 6 caracteres' });
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = t('confirm_password_error', { defaultValue: 'Senhas não coincidem' });
    }

    if (!termsAccepted) {
      newErrors.terms = t('terms_error', { defaultValue: 'Você deve aceitar os termos de uso para continuar' });
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsSubmitting(true);

    const params = new URLSearchParams(location.search);
    const referralCode = params.get('ref') || undefined;

    const result = await register(formData.name, formData.email, formData.password, referralCode);

    if (!result.error) {
      navigate('/dashboard');
    }

    setIsSubmitting(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-summi-green/5 to-summi-secondary/5">
        <SEO title={t('loading')} description={t('please_wait')} noIndex />
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-summi-green"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-summi-green/5 to-summi-secondary/5 py-12 px-4 sm:px-6 lg:px-8">
      <SEO
        title={t('register_title')}
        description={t('register_description', { defaultValue: 'Crie sua conta na Summi e comece a automatizar seu WhatsApp com Inteligência Artificial.' })}
        canonicalPath="/register"
        author="Summi Team"
      />
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="flex items-center justify-center space-x-3 mb-6">
            <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-lg">
              <img
                src="/lovable-uploads/3cf7feb3-ab92-46ee-85a8-7706495a4bcf.png"
                alt="Summi Logo"
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <p className="text-3xl font-bold bg-gradient-to-r from-summi-green to-summi-secondary bg-clip-text text-transparent">
                Summi
              </p>
              <p className="text-sm text-summi-gray-600">Inteligência Artificial para WhatsApp</p>
            </div>
          </div>
          <h1 className="text-3xl font-bold text-summi-gray-900">
            {t('register_title')}
          </h1>
          <div className="mt-4">
            <h2 className="text-sm text-summi-gray-600 font-normal">
              <Link to="/login" className="font-medium text-summi-green hover:text-summi-secondary transition-colors">
                {t('already_have_account')}
              </Link>
            </h2>
          </div>
        </div>

        <Card className="card-hover shadow-xl border-0 bg-white/80 backdrop-blur-sm">
          <CardContent className="p-6 pt-8">
            <form onSubmit={handleSubmit} className="space-y-4">
              <h2 className="text-lg font-semibold text-summi-gray-900 text-center mb-4">{t('create_your_account', { defaultValue: 'Crie sua conta' })}</h2>
              <div>
                <Label htmlFor="name" className="text-summi-gray-700 font-medium">{t('name_label')}</Label>
                <Input
                  id="name"
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder={t('your_name', { defaultValue: 'Seu nome' })}
                  className={`mt-1 border-summi-gray-300 focus:border-summi-green focus:ring-summi-green/20 ${errors.name ? 'border-red-500' : ''}`}
                />
                {errors.name && (
                  <p className="text-red-500 text-sm mt-1">{errors.name}</p>
                )}
              </div>

              <div>
                <Label htmlFor="email" className="text-summi-gray-700 font-medium">{t('email')}</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="seu@email.com"
                  className={`mt-1 border-summi-gray-300 focus:border-summi-green focus:ring-summi-green/20 ${errors.email ? 'border-red-500' : ''}`}
                />
                {errors.email && (
                  <p className="text-red-500 text-sm mt-1">{errors.email}</p>
                )}
              </div>

              <div>
                <Label htmlFor="password" className="text-summi-gray-700 font-medium">{t('password')}</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="••••••••"
                  className={`mt-1 border-summi-gray-300 focus:border-summi-green focus:ring-summi-green/20 ${errors.password ? 'border-red-500' : ''}`}
                />
                {errors.password && (
                  <p className="text-red-500 text-sm mt-1">{errors.password}</p>
                )}
              </div>

              <div>
                <Label htmlFor="confirmPassword" className="text-summi-gray-700 font-medium">{t('confirm_password')}</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  required
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  placeholder="••••••••"
                  className={`mt-1 border-summi-gray-300 focus:border-summi-green focus:ring-summi-green/20 ${errors.confirmPassword ? 'border-red-500' : ''}`}
                />
                {errors.confirmPassword && (
                  <p className="text-red-500 text-sm mt-1">{errors.confirmPassword}</p>
                )}
              </div>

              <div className="pt-2">
                <TermsCheckbox
                  checked={termsAccepted}
                  onCheckedChange={setTermsAccepted}
                  error={errors.terms}
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-summi-green to-summi-secondary hover:from-summi-green/90 hover:to-summi-secondary/90 text-white font-medium shadow-lg"
                disabled={isSubmitting}
              >
                {isSubmitting ? t('creating_account') : t('create_account')}
              </Button>

              <p className="text-xs text-center text-summi-gray-500">
                {t('terms_agreement')}
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RegisterPage;
