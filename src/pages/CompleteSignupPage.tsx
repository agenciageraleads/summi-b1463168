// ABOUTME: Página pós-Stripe Checkout para definir senha da conta.
// ABOUTME: Recebe session_id da URL, verifica sessão, e permite ao usuário criar sua senha.

import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Lock, CheckCircle, Loader2 } from 'lucide-react';

const CompleteSignupPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sessionData, setSessionData] = useState<{
    email: string;
    name: string | null;
    phone: string | null;
    needs_password_setup: boolean;
    user_exists: boolean;
  } | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isDone, setIsDone] = useState(false);

  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    if (!sessionId) {
      toast({
        title: 'Erro',
        description: 'Sessão de checkout não encontrada.',
        variant: 'destructive',
      });
      navigate('/');
      return;
    }

    verifySession();
  }, [sessionId]);

  const verifySession = async () => {
    try {
      setIsLoading(true);

      const { data, error } = await supabase.functions.invoke('verify-checkout-session', {
        body: { sessionId },
      });

      if (error) throw error;

      if (!data.needs_password_setup) {
        // Já definiu senha — redirecionar para login
        toast({
          title: 'Conta já configurada',
          description: 'Faça login para acessar sua conta.',
        });
        navigate('/login');
        return;
      }

      setSessionData(data);
    } catch (error) {
      console.error('Erro ao verificar sessão:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível verificar o checkout. O pagamento pode ainda estar sendo processado. Tente recarregar a página.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast({
        title: 'Erro',
        description: 'As senhas não coincidem.',
        variant: 'destructive',
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: 'Erro',
        description: 'A senha deve ter pelo menos 6 caracteres.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsSubmitting(true);

      const { data, error } = await supabase.functions.invoke('complete-signup', {
        body: {
          email: sessionData!.email,
          password,
        },
      });

      if (error) throw error;

      // Auto-login
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: sessionData!.email,
        password,
      });

      if (loginError) {
        // Se auto-login falhar, pedir para logar manualmente
        setIsDone(true);
        return;
      }

      toast({
        title: '🎉 Conta criada com sucesso!',
        description: 'Vamos configurar seu perfil.',
      });

      navigate('/settings');
    } catch (error) {
      console.error('Erro ao definir senha:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível definir a senha. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-white">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-green-600 mx-auto" />
          <p className="text-gray-600">Verificando seu pagamento...</p>
        </div>
      </div>
    );
  }

  if (isDone) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-white p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
            <CardTitle className="text-2xl">Conta criada!</CardTitle>
            <CardDescription>
              Faça login com seu email e senha para continuar.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => navigate('/login')}
              className="w-full bg-green-600 hover:bg-green-700 text-white"
            >
              Ir para o Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!sessionData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-white p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Erro ao carregar</CardTitle>
            <CardDescription>
              O pagamento pode ainda estar sendo processado. Tente recarregar a página em alguns segundos.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button onClick={verifySession} className="w-full" variant="outline">
              Tentar novamente
            </Button>
            <Button onClick={() => navigate('/')} className="w-full" variant="ghost">
              Voltar para o início
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-white p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-green-600" />
          </div>
          <CardTitle className="text-2xl">
            Bem-vindo{sessionData.name ? `, ${sessionData.name}` : ''}! 🎉
          </CardTitle>
          <CardDescription>
            Pagamento confirmado! Agora defina uma senha para acessar sua conta.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={sessionData.email}
                disabled
                className="bg-gray-50"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                placeholder="Mínimo 6 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar senha</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Repita a senha"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-green-600 hover:bg-green-700 text-white"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Criando conta...
                </>
              ) : (
                'Definir Senha e Continuar'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CompleteSignupPage;
