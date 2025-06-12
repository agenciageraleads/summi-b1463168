
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

const RegisterPage = () => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    company: '',
    phone: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleStep1Submit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.email || !formData.password) {
      toast({
        title: "Erro",
        description: "Por favor, preencha todos os campos obrigatórios",
        variant: "destructive"
      });
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Erro",
        description: "As senhas não coincidem",
        variant: "destructive"
      });
      return;
    }

    if (formData.password.length < 6) {
      toast({
        title: "Erro",
        description: "A senha deve ter pelo menos 6 caracteres",
        variant: "destructive"
      });
      return;
    }

    setStep(2);
  };

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await register(formData.name, formData.email, formData.password);
      toast({
        title: "Conta criada com sucesso! 🎉",
        description: "Bem-vindo à Summi!",
      });
      navigate('/dashboard');
    } catch (error) {
      toast({
        title: "Erro no registro",
        description: "Ocorreu um erro ao criar sua conta. Tente novamente.",
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
              {step === 1 ? 'Crie sua conta 🚀' : 'Quase pronto! ✨'}
            </CardTitle>
            <p className="text-summi-gray-600">
              {step === 1 
                ? 'Comece seu teste grátis de 14 dias' 
                : 'Informações adicionais (opcional)'
              }
            </p>
            
            {/* Progress Indicator */}
            <div className="flex justify-center mt-4">
              <div className="flex space-x-2">
                <div className={`w-3 h-3 rounded-full ${step >= 1 ? 'bg-summi-blue' : 'bg-summi-gray-300'}`} />
                <div className={`w-3 h-3 rounded-full ${step >= 2 ? 'bg-summi-blue' : 'bg-summi-gray-300'}`} />
              </div>
            </div>
          </CardHeader>
          
          <CardContent>
            {step === 1 ? (
              <form onSubmit={handleStep1Submit} className="space-y-4">
                <div>
                  <Label htmlFor="name">Nome completo *</Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="Ana Silva"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className="mt-1"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="email">E-mail corporativo *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="ana@empresa.com"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className="mt-1"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="password">Senha *</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Mínimo 6 caracteres"
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    className="mt-1"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="confirmPassword">Confirmar senha *</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Digite a senha novamente"
                    value={formData.confirmPassword}
                    onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                    className="mt-1"
                    required
                  />
                </div>

                <Button type="submit" className="w-full btn-primary">
                  Continuar →
                </Button>
              </form>
            ) : (
              <form onSubmit={handleFinalSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="company">Nome da empresa</Label>
                  <Input
                    id="company"
                    type="text"
                    placeholder="Sua Empresa Ltda"
                    value={formData.company}
                    onChange={(e) => handleInputChange('company', e.target.value)}
                    className="mt-1"
                  />
                </div>
                
                <div>
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="(11) 99999-9999"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    className="mt-1"
                  />
                </div>

                <div className="flex space-x-3">
                  <Button 
                    type="button" 
                    variant="outline"
                    onClick={() => setStep(1)}
                    className="flex-1"
                  >
                    ← Voltar
                  </Button>
                  <Button 
                    type="submit" 
                    className="flex-1 btn-success"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <div className="flex items-center space-x-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Criando...</span>
                      </div>
                    ) : (
                      'Criar conta 🎉'
                    )}
                  </Button>
                </div>
              </form>
            )}

            <div className="mt-6 text-center">
              <p className="text-summi-gray-600">
                Já tem uma conta?{' '}
                <Link to="/login" className="text-summi-blue hover:text-summi-blue-dark font-medium">
                  Faça login
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 text-center text-sm text-summi-gray-600">
          ✅ Teste grátis por 14 dias • ✅ Sem cartão de crédito • ✅ Cancele quando quiser
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
