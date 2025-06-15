
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Gift, Calendar, CheckCircle, ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const ReferralPage: React.FC = () => {
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
        setIsValidCode(false);
        setIsLoading(false);
        return;
      }

      try {
        console.log('[REFERRAL-PAGE] Validando código:', referralCode);
        
        const { data, error } = await supabase
          .from('profiles')
          .select('nome')
          .eq('referral_code', referralCode.toUpperCase())
          .single();

        if (error || !data) {
          console.error('[REFERRAL-PAGE] Código inválido:', error);
          setIsValidCode(false);
        } else {
          console.log('[REFERRAL-PAGE] Código válido, referrer:', data.nome);
          setReferrerName(data.nome);
          setIsValidCode(true);
        }
      } catch (error) {
        console.error('[REFERRAL-PAGE] Erro ao validar código:', error);
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
        title: "Erro",
        description: "As senhas não conferem",
        variant: "destructive",
      });
      return;
    }

    if (formData.password.length < 6) {
      toast({
        title: "Erro", 
        description: "A senha deve ter pelo menos 6 caracteres",
        variant: "destructive",
      });
      return;
    }

    setIsRegistering(true);

    try {
      console.log('[REFERRAL-PAGE] Iniciando registro com indicação');
      
      // Chamar a função de signup com código de indicação
      const { data, error } = await supabase.functions.invoke('handle-signup', {
        body: {
          name: formData.name,
          email: formData.email,
          password: formData.password,
          referralCode: referralCode
        }
      });

      if (error) {
        console.error('[REFERRAL-PAGE] Erro no registro:', error);
        throw error;
      }

      if (!data.success) {
        throw new Error(data.error || 'Erro no registro');
      }

      console.log('[REFERRAL-PAGE] Registro bem-sucedido');
      
      toast({
        title: "Conta criada com sucesso!",
        description: data.message,
      });

      // Redirecionar para login ou dashboard
      setTimeout(() => {
        navigate('/login', { 
          state: { 
            message: 'Conta criada! Faça login para começar seu teste gratuito de 10 dias.',
            email: formData.email 
          }
        });
      }, 2000);

    } catch (error) {
      console.error('[REFERRAL-PAGE] Erro inesperado:', error);
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro inesperado ao criar conta",
        variant: "destructive",
      });
    } finally {
      setIsRegistering(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-gray-600">Validando convite...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isValidCode) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-red-600">Convite Inválido</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-gray-600">
              Este link de convite não é válido ou pode ter expirado.
            </p>
            <Button onClick={() => navigate('/register')} className="w-full">
              Criar Conta Normalmente
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
            <Gift className="h-8 w-8 text-green-600" />
          </div>
          <CardTitle className="text-2xl">Você foi convidado!</CardTitle>
          <p className="text-gray-600">
            <strong>{referrerName}</strong> te convidou para conhecer a Summi
          </p>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Benefícios */}
          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <h3 className="font-semibold text-green-800 mb-3 flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Seus benefícios especiais:
            </h3>
            <ul className="space-y-2 text-sm text-green-700">
              <li className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span><strong>10 dias</strong> de teste gratuito (3 a mais que o normal)</span>
              </li>
              <li className="flex items-center gap-2">
                <Gift className="h-4 w-4" />
                <span>Acesso completo a todas as funcionalidades</span>
              </li>
              <li className="flex items-center gap-2">
                <ArrowRight className="h-4 w-4" />
                <span>Seu amigo também ganha 3 dias extras!</span>
              </li>
            </ul>
          </div>

          {/* Formulário de Registro */}
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <Label htmlFor="name">Nome completo</Label>
              <Input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                placeholder="Seu nome completo"
              />
            </div>

            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                placeholder="seu@email.com"
              />
            </div>

            <div>
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                placeholder="Mínimo 6 caracteres"
                minLength={6}
              />
            </div>

            <div>
              <Label htmlFor="confirmPassword">Confirmar senha</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                required
                placeholder="Confirme sua senha"
              />
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              disabled={isRegistering}
            >
              {isRegistering ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Criando conta...
                </>
              ) : (
                'Ativar Teste de 10 Dias'
              )}
            </Button>
          </form>

          <div className="text-center text-xs text-gray-500">
            Já tem uma conta?{' '}
            <Button 
              variant="link" 
              className="p-0 h-auto text-xs"
              onClick={() => navigate('/login')}
            >
              Fazer login
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ReferralPage;
