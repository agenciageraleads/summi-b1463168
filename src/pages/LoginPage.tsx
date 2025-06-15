
import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';

const LoginPage = () => {
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

  // Mostrar mensagem de sucesso se veio do registro
  useEffect(() => {
    if (location.state?.message) {
      // Toast já é exibido pelo AuthContext, não precisa duplicar
    }
  }, [location.state]);

  // Efeito para redirecionar o usuário após o login bem-sucedido.
  // Isso garante que a navegação só ocorra quando o estado de 'user' for atualizado.
  useEffect(() => {
    if (user && !isLoading) {
      navigate('/dashboard');
    }
  }, [user, isLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // A função de login é chamada, e os toasts de sucesso/erro são exibidos.
    await login(formData.email, formData.password);
    
    // A navegação foi removida daqui para evitar a condição de corrida.
    // O useEffect acima agora é o único responsável pelo redirecionamento.
    
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
      <div className="min-h-screen flex items-center justify-center bg-summi-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-summi-blue"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-summi-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Logo */}
        <div className="text-center">
          <Link to="/" className="flex items-center justify-center space-x-2">
            <div className="w-12 h-12 bg-summi-blue rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-xl">S</span>
            </div>
            <span className="text-2xl font-bold text-summi-blue">Summi</span>
          </Link>
          <h2 className="mt-6 text-3xl font-bold text-summi-gray-900">
            {showResetPassword ? 'Redefinir Senha' : 'Entre na sua conta'}
          </h2>
          <p className="mt-2 text-sm text-summi-gray-600">
            {showResetPassword 
              ? 'Digite seu e-mail para receber instruções'
              : 'Ou '}
            {!showResetPassword && (
              <Link to="/register" className="font-medium text-summi-blue hover:underline">
                cadastre-se gratuitamente
              </Link>
            )}
          </p>
        </div>

        {/* Mensagem de sucesso do registro */}
        {location.state?.message && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-sm text-green-800 text-center">
              {location.state.message}
            </p>
          </div>
        )}

        {/* Form */}
        <Card className="card-hover">
          <CardHeader>
            <CardTitle className="text-center text-summi-gray-900">
              {showResetPassword ? 'Recuperar Acesso' : 'Fazer Login'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {showResetPassword ? (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div>
                  <Label htmlFor="resetEmail" className="text-summi-gray-700">E-mail</Label>
                  <Input
                    id="resetEmail"
                    type="email"
                    required
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="seu@email.com"
                    className="mt-1"
                  />
                </div>
                
                <div className="flex space-x-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => setShowResetPassword(false)}
                  >
                    Voltar
                  </Button>
                  <Button
                    type="submit"
                    className="btn-primary flex-1"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Enviando...' : 'Enviar'}
                  </Button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="email" className="text-summi-gray-700">E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    placeholder="seu@email.com"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="password" className="text-summi-gray-700">Senha</Label>
                  <Input
                    id="password"
                    type="password"
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    placeholder="••••••••"
                    className="mt-1"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setShowResetPassword(true)}
                    className="text-sm text-summi-blue hover:underline"
                  >
                    Esqueci minha senha
                  </button>
                </div>

                <Button
                  type="submit"
                  className="btn-primary w-full"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Entrando...' : 'Entrar'}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LoginPage;
