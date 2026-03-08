import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';
import { GoogleLoginButton } from '@/components/auth/GoogleLoginButton';
import { SEO } from '@/components/SEO';
import { useTranslation } from 'react-i18next';

const LoginPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { login, resetPassword, user, isLoading } = useAuth();
  const [formData, setFormData] = useState({
    email: location.state?.email || '',
    password: ''
  });
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user && !isLoading) {
      navigate('/dashboard');
    }
  }, [user, isLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    await login(formData.email, formData.password);
    setIsSubmitting(false);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const result = await resetPassword(resetEmail);
    if (!result.error) {
      setShowResetPassword(false);
      setResetEmail('');
    }
    setIsSubmitting(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-summi-green/5 to-summi-green/10">
        <SEO title={t('loading', { defaultValue: 'Carregando...' })} description={t('please_wait', { defaultValue: 'Aguarde...' })} noIndex />
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-summi-green"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-summi-green/5 to-summi-green/10 py-12 px-4 sm:px-6 lg:px-8">
      <SEO
        title={showResetPassword ? t('reset_password') : t('login_title')}
        description={t('login_description', { defaultValue: 'Entre na sua conta Summi para gerenciar suas automações.' })}
        canonicalPath="/login"
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
          <h1 className="text-3xl font-bold text-summi-gray-900 mt-2">
            {showResetPassword ? t('reset_password') : t('login_title')}
          </h1>
          <p className="mt-2 text-sm text-summi-gray-600">
            {showResetPassword
              ? t('reset_password_instructions', { defaultValue: 'Digite seu e-mail para receber instruções.' })
              : t('login_subtitle')}
          </p>
        </div>

        {location.state?.message && (
          <div className="bg-summi-green/10 border border-summi-green/20 rounded-lg p-4">
            <p className="text-sm text-summi-green font-medium text-center">
              {location.state.message}
            </p>
          </div>
        )}

        <Card className="card-hover shadow-xl border-0 bg-white/80 backdrop-blur-sm">
          <CardContent className="p-6 pt-8">
            {showResetPassword ? (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <h2 className="text-lg font-semibold text-summi-gray-900 text-center mb-4">{t('reset_password')}</h2>
                <div>
                  <Label htmlFor="resetEmail" className="text-summi-gray-700 font-medium">{t('email')}</Label>
                  <Input
                    id="resetEmail"
                    type="email"
                    required
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="seu@email.com"
                    className="mt-1 border-summi-gray-300 focus:border-summi-green focus:ring-summi-green/20"
                  />
                </div>

                <div className="flex space-x-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 border-summi-gray-300 text-summi-gray-700 hover:bg-summi-gray-50"
                    onClick={() => setShowResetPassword(false)}
                  >
                    {t('back')}
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 bg-gradient-to-r from-summi-green to-summi-secondary hover:from-summi-green/90 hover:to-summi-secondary/90 text-white font-medium shadow-lg"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? t('sending') : t('send')}
                  </Button>
                </div>
              </form>
            ) : (
              <>
                <div className="space-y-4">
                  <h2 className="text-sm font-medium text-summi-gray-500 text-center mb-2">{t('login_social', { defaultValue: 'Acesse com sua rede social' })}</h2>
                  <GoogleLoginButton />
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-summi-gray-300" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-white px-2 text-summi-gray-500">{t('or_continue_with', { defaultValue: 'Ou continue com' })}</span>
                    </div>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4 mt-6">
                  <h2 className="text-sm font-medium text-summi-gray-500 text-center mb-4">{t('login_email', { defaultValue: 'Acesse com seu e-mail' })}</h2>
                  <div>
                    <Label htmlFor="email" className="text-summi-gray-700 font-medium">{t('email')}</Label>
                    <Input
                      id="email"
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="seu@email.com"
                      className="mt-1 border-summi-gray-300 focus:border-summi-green focus:ring-summi-green/20"
                    />
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
                      className="mt-1 border-summi-gray-300 focus:border-summi-green focus:ring-summi-green/20"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setShowResetPassword(true)}
                      className="text-sm text-summi-green hover:text-summi-secondary transition-colors"
                    >
                      {t('forgot_password')}
                    </button>
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-summi-green to-summi-secondary hover:from-summi-green/90 hover:to-summi-secondary/90 text-white font-medium shadow-lg"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? t('logging_in') : t('login_button')}
                  </Button>
                </form>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LoginPage;
