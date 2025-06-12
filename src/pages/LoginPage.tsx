
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast({
        title: "Erro",
        description: "Por favor, preencha todos os campos",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      await login(email, password);
      toast({
        title: "Sucesso!",
        description: "Login realizado com sucesso",
      });
      navigate('/dashboard');
    } catch (error) {
      toast({
        title: "Erro no login",
        description: "Verifique suas credenciais e tente novamente",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-summi-gray-50 px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center space-x-2">
            <div className="w-10 h-10 bg-summi-blue rounded-lg flex items-center justify-center">
              <span className="text-white font-bold">S</span>
            </div>
            <span className="text-2xl font-bold text-summi-blue">Summi</span>
          </Link>
        </div>

        <Card className="shadow-lg border-0">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl text-summi-gray-900">
              Bem-vindo de volta! 👋
            </CardTitle>
            <p className="text-summi-gray-600">
              Faça login para acessar sua conta
            </p>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1"
                  required
                />
              </div>

              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center space-x-2">
                  <input type="checkbox" className="rounded border-summi-gray-300" />
                  <span className="text-summi-gray-600">Lembrar de mim</span>
                </label>
                <a href="#" className="text-summi-blue hover:text-summi-blue-dark">
                  Esqueci minha senha
                </a>
              </div>

              <Button 
                type="submit" 
                className="w-full btn-primary"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Entrando...</span>
                  </div>
                ) : (
                  'Entrar'
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-summi-gray-600">
                Não tem uma conta?{' '}
                <Link to="/register" className="text-summi-blue hover:text-summi-blue-dark font-medium">
                  Registre-se grátis
                </Link>
              </p>
            </div>

            {/* Magic Link Option */}
            <div className="mt-4 pt-4 border-t border-summi-gray-200">
              <Button 
                variant="outline" 
                className="w-full border-summi-gray-300 text-summi-gray-700 hover:bg-summi-gray-50"
              >
                ✨ Entrar com link mágico
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 text-center text-sm text-summi-gray-600">
          Ao continuar, você concorda com nossos{' '}
          <a href="#" className="text-summi-blue hover:underline">Termos de Uso</a>
          {' '}e{' '}
          <a href="#" className="text-summi-blue hover:underline">Política de Privacidade</a>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
