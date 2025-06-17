
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';

const RegisterPage = () => {
  const navigate = useNavigate();
  const { register, user, isLoading } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Redirect if already logged in
  useEffect(() => {
    if (user && !isLoading) {
      navigate('/dashboard');
    }
  }, [user, isLoading, navigate]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (formData.name.trim().length < 2) {
      newErrors.name = 'Nome deve ter pelo menos 2 caracteres';
    }

    if (!formData.email.includes('@')) {
      newErrors.email = 'E-mail inválido';
    }

    if (formData.password.length < 6) {
      newErrors.password = 'Senha deve ter pelo menos 6 caracteres';
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Senhas não coincidem';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    
    const result = await register(formData.name, formData.email, formData.password);
    
    if (!result.error) {
      navigate('/dashboard');
    }
    
    setIsSubmitting(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-summi-green/5 to-summi-secondary/5">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-summi-green"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-summi-green/5 to-summi-secondary/5 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Logo Oficial Summi */}
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
              <h1 className="text-3xl font-bold bg-gradient-to-r from-summi-green to-summi-secondary bg-clip-text text-transparent">
                Summi
              </h1>
              <p className="text-sm text-summi-gray-600">Inteligência Artificial para WhatsApp</p>
            </div>
          </div>
          <h2 className="text-3xl font-bold text-summi-gray-900">
            Crie sua conta
          </h2>
          <div className="mt-4 space-y-3">
            <div className="bg-gradient-to-r from-summi-green/10 to-summi-secondary/10 border border-summi-green/20 rounded-lg p-4">
              <p className="text-lg font-bold text-summi-green">
                🎉 Trial de 7 dias GRÁTIS
              </p>
              <p className="text-sm text-summi-gray-600">
                Sem cartão de crédito • Acesso completo
              </p>
            </div>
            <p className="text-sm text-summi-gray-600">
              Ou{' '}
              <Link to="/login" className="font-medium text-summi-green hover:text-summi-secondary transition-colors">
                faça login na sua conta existente
              </Link>
            </p>
          </div>
        </div>

        {/* Form */}
        <Card className="card-hover shadow-xl border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="bg-gradient-to-r from-summi-green/5 to-summi-secondary/5 rounded-t-lg">
            <CardTitle className="text-center text-summi-gray-900">
              Trial Gratuito de 7 Dias
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name" className="text-summi-gray-700 font-medium">Nome completo</Label>
                <Input
                  id="name"
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="Seu nome"
                  className={`mt-1 border-summi-gray-300 focus:border-summi-green focus:ring-summi-green/20 ${errors.name ? 'border-red-500' : ''}`}
                />
                {errors.name && (
                  <p className="text-red-500 text-sm mt-1">{errors.name}</p>
                )}
              </div>

              <div>
                <Label htmlFor="email" className="text-summi-gray-700 font-medium">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  placeholder="seu@email.com"
                  className={`mt-1 border-summi-gray-300 focus:border-summi-green focus:ring-summi-green/20 ${errors.email ? 'border-red-500' : ''}`}
                />
                {errors.email && (
                  <p className="text-red-500 text-sm mt-1">{errors.email}</p>
                )}
              </div>

              <div>
                <Label htmlFor="password" className="text-summi-gray-700 font-medium">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  placeholder="••••••••"
                  className={`mt-1 border-summi-gray-300 focus:border-summi-green focus:ring-summi-green/20 ${errors.password ? 'border-red-500' : ''}`}
                />
                {errors.password && (
                  <p className="text-red-500 text-sm mt-1">{errors.password}</p>
                )}
              </div>

              <div>
                <Label htmlFor="confirmPassword" className="text-summi-gray-700 font-medium">Confirmar senha</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  required
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                  placeholder="••••••••"
                  className={`mt-1 border-summi-gray-300 focus:border-summi-green focus:ring-summi-green/20 ${errors.confirmPassword ? 'border-red-500' : ''}`}
                />
                {errors.confirmPassword && (
                  <p className="text-red-500 text-sm mt-1">{errors.confirmPassword}</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-summi-green to-summi-secondary hover:from-summi-green/90 hover:to-summi-secondary/90 text-white font-medium shadow-lg"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Criando conta e ativando trial...' : 'Começar trial gratuito'}
              </Button>
              
              <p className="text-xs text-center text-summi-gray-500">
                Ao criar sua conta, você concorda com nossos termos de uso
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RegisterPage;
