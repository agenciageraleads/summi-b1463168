
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Gift, Calendar, CheckCircle, ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import { SEO } from '@/components/SEO';

const ReferralPage: React.FC = () => {
  const { t } = useTranslation();
  const { referralCode } = useParams<{ referralCode: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [referrerName, setReferrerName] = useState<string>('');
  const [isValidCode, setIsValidCode] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRegistering, setIsRegistering] = useState(false);

  // Dados do formulário
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  // Verificar se o código de indicação é válido
  useEffect(() => {
    const validateReferralCode = async () => {
      if (!referralCode) {
        console.log('[REFERRAL-PAGE] Código não fornecido');
        setIsValidCode(false);
        setIsLoading(false);
        return;
      }

      try {
        console.log('[REFERRAL-PAGE] Validando código:', referralCode);

        // Buscar perfil com o código de indicação (case insensitive)
        const { data, error } = await supabase
          .from('profiles')
          .select('nome')
          .ilike('referral_code', referralCode)
          .single();

        if (error) {
          console.error('[REFERRAL-PAGE] Erro na query:', error);
          setIsValidCode(false);
        } else if (!data) {
          console.log('[REFERRAL-PAGE] Código não encontrado');
          setIsValidCode(false);
        } else {
          console.log('[REFERRAL-PAGE] Código válido, referrer:', data.nome);
          setReferrerName(data.nome);
          setIsValidCode(true);
        }
      } catch (error) {
        console.error('[REFERRAL-PAGE] Erro inesperado:', error);
        setIsValidCode(false);
      } finally {
        setIsLoading(false);
      }
    };

    validateReferralCode();
  }, [referralCode]);

  // Função para registrar com código de indicação
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      toast({
        title: t("error"),
        description: t("passwords_do_not_match"),
        variant: "destructive",
      });
      return;
    }

    if (formData.password.length < 6) {
      toast({
        title: t("error"),
        description: t("password_min_length"),
        variant: "destructive",
      });
      return;
    }

    setIsRegistering(true);

    try {
      console.log('[REFERRAL-PAGE] Iniciando registro com indicação, código:', referralCode);

      // Chamar a função de signup com código de indicação
      const { data, error } = await supabase.functions.invoke('handle-signup', {
        body: {
          name: formData.name,
          email: formData.email,
          password: formData.password,
          referralCode: referralCode?.toUpperCase()
        }
      });

      if (error) {
        console.error('[REFERRAL-PAGE] Erro no registro:', error);
        throw error;
      }

      if (!data?.success) {
        throw new Error(data?.error || t('registration_error'));
      }

      console.log('[REFERRAL-PAGE] Registro bem-sucedido');

      toast({
        title: t("account_created_success_title"),
        description: data.message || t("account_created_success_desc"),
      });

      // Redirecionar para login com mensagem
      setTimeout(() => {
        navigate('/login', {
          state: {
            message: t('account_created_login_message'),
            email: formData.email
          }
        });
      }, 2000);

    } catch (error) {
      console.error('[REFERRAL-PAGE] Erro inesperado:', error);
      toast({
        title: t("error"),
        description: error instanceof Error ? error.message : t("unexpected_error_creating_account"),
        variant: "destructive",
      });
    } finally {
      setIsRegistering(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F5F7F6] flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#00A36C] mx-auto"></div>
              <p className="mt-4 text-[#4A4D4C]">{t('validating_invite')}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isValidCode) {
    return (
      <div className="min-h-screen bg-[#F5F7F6] flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
              <span className="text-red-600 text-2xl">❌</span>
            </div>
            <h2 className="text-2xl font-bold text-red-600">{t('invitation_invalid_title')}</h2>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-[#4A4D4C]">
              {t('invitation_invalid_desc')}
            </p>
            <Button
              onClick={() => navigate('/register')}
              className="w-full bg-[#00A36C] hover:bg-[#008F5D]"
            >
              {t('create_account_normal')}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F7F6]">
      <SEO
        title={t('you_were_invited')}
        description={t('referral_page_desc')}
        author="Summi"
      />
      <div className="flex items-center justify-center p-4 min-h-screen">
        <Card className="w-full max-w-md shadow-lg border-[#E9EDEB]">
          <CardHeader className="text-center pt-8">
            <div className="mx-auto mb-4 w-16 h-16 bg-[#00A36C]/10 rounded-full flex items-center justify-center">
              <Gift className="h-8 w-8 text-[#00A36C]" />
            </div>
            <h1 className="text-2xl font-bold text-[#1A1C1B]">{t('you_were_invited')}</h1>
            <p className="text-[#4A4D4C]">
              <strong>{referrerName}</strong> {t('invited_you_to_summi')}
            </p>
          </CardHeader>

          <CardContent className="space-y-6 pb-8">
            <div className="bg-[#00A36C]/5 p-4 rounded-xl border border-[#00A36C]/10">
              <h2 className="font-semibold text-[#1A1C1B] mb-3 flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-[#00A36C]" />
                {t('special_benefits_title')}
              </h2>
              <ul className="space-y-2 text-sm text-[#4A4D4C]">
                <li className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-[#00A36C]" />
                  <span>{t('special_benefit_days')}</span>
                </li>
                <li className="flex items-center gap-2">
                  <Gift className="h-4 w-4 text-[#00A36C]" />
                  <span>{t('special_benefit_access')}</span>
                </li>
              </ul>
            </div>

            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="name" className="text-summi-gray-700 font-medium">{t('full_name')}</Label>
                <Input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  placeholder={t('full_name_placeholder')}
                  className="bg-white border-[#E9EDEB] focus:border-[#000000]"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="email" className="text-summi-gray-700 font-medium">{t('email')}</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  placeholder="seu@email.com"
                  className="bg-white border-[#E9EDEB] focus:border-[#000000]"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="password" className="text-summi-gray-700 font-medium">{t('password')}</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  placeholder="••••••••"
                  minLength={6}
                  className="bg-white border-[#E9EDEB] focus:border-[#000000]"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="confirmPassword" className="text-summi-gray-700 font-medium">{t('confirm_password')}</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  required
                  placeholder="••••••••"
                  className="bg-white border-[#E9EDEB] focus:border-[#000000]"
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-[#00A36C] hover:bg-[#008F5D] text-white font-bold h-11"
                disabled={isRegistering}
              >
                {isRegistering ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    {t('creating_account')}
                  </>
                ) : (
                  t('activate_trial_button')
                )}
              </Button>
            </form>

            <div className="text-center text-sm text-[#4A4D4C]">
              {t('already_have_account')}{' '}
              <Button
                variant="link"
                className="p-0 h-auto font-semibold text-[#00A36C] hover:text-[#008F5D]"
                onClick={() => navigate('/login')}
              >
                {t('login')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ReferralPage;
