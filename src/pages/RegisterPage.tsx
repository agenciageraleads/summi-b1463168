
// ABOUTME: Página de registro simplificada sem menções a trial ou assinatura.
// ABOUTME: Foco apenas na criação de conta para usar o produto.

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { MessageSquare, ArrowLeft, Mail, Lock, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { TermsCheckbox } from '@/components/TermsCheckbox';

const RegisterPage = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    referralCode: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const navigate = useNavigate();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!termsAccepted) {
      setError('Você deve aceitar os termos de uso para continuar.');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }

    if (formData.password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    setIsLoading(true);
    
    try {
      // Usar edge function que cuida de tudo
      const { data, error: signupError } = await supabase.functions.invoke('handle-signup', {
        body: {
          name: formData.name,
          email: formData.email,
          password: formData.password,
          referralCode: formData.referralCode || null
        }
      });

      if (signupError) {
        throw signupError;
      }

      if (!data.success) {
        throw new Error(data.error || 'Erro ao criar conta');
      }

      // Redirecionar para dashboard
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Erro ao criar conta. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-summi-green/5 to-summi-secondary/5 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Back Button */}
        <div className="mb-6">
          <Link to="/">
            <Button variant="ghost" className="text-summi-green hover:text-summi-secondary">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
          </Link>
        </div>

        <Card className="border-summi-green/20 shadow-lg">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="w-12 h-12 bg-summi-gradient rounded-lg flex items-center justify-center">
                <MessageSquare className="w-6 h-6 text-white" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-summi-gray-900">
              Criar Conta
            </CardTitle>
            <CardDescription className="text-summi-gray-600">
              Comece a usar a Summi hoje mesmo
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="name" className="text-summi-gray-700">Nome Completo</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-summi-gray-400 w-4 h-4" />
                  <Input
                    id="name"
                    name="name"
                    type="text"
                    placeholder="Seu nome completo"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    className="pl-10 border-summi-gray-300 focus:border-summi-green focus:ring-summi-green"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-summi-gray-700">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-summi-gray-400 w-4 h-4" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    className="pl-10 border-summi-gray-300 focus:border-summi-green focus:ring-summi-green"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-summi-gray-700">Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-summi-gray-400 w-4 h-4" />
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={handleInputChange}
                    required
                    className="pl-10 border-summi-gray-300 focus:border-summi-green focus:ring-summi-green"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-summi-gray-700">Confirmar Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-summi-gray-400 w-4 h-4" />
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    required
                    className="pl-10 border-summi-gray-300 focus:border-summi-green focus:ring-summi-green"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="referralCode" className="text-summi-gray-700">Código de Indicação (Opcional)</Label>
                <Input
                  id="referralCode"
                  name="referralCode"
                  type="text"
                  placeholder="Digite o código se tiver"
                  value={formData.referralCode}
                  onChange={handleInputChange}
                  className="border-summi-gray-300 focus:border-summi-green focus:ring-summi-green"
                />
              </div>

              <TermsCheckbox
                checked={termsAccepted}
                onChange={setTermsAccepted}
              />

              <Button
                type="submit"
                disabled={isLoading || !termsAccepted}
                className="w-full bg-summi-gradient hover:opacity-90 text-white font-semibold py-2"
              >
                {isLoading ? 'Criando conta...' : 'Criar Conta'}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-summi-gray-600">
                Já tem uma conta?{' '}
                <Link to="/login" className="text-summi-green hover:text-summi-secondary font-medium">
                  Fazer login
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RegisterPage;
