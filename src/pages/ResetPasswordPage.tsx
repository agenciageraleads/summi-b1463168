
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const ResetPasswordPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Handle the auth callback for password reset
    const handleAuthStateChange = () => {
      supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'PASSWORD_RECOVERY') {
          // User is in password recovery mode
        }
      });
    };

    handleAuthStateChange();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast({
        title: "Erro",
        description: "As senhas não coincidem",
        variant: "destructive",
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: "Erro",
        description: "A senha deve ter pelo menos 6 caracteres",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) {
        toast({
          title: "Erro",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Sucesso!",
        description: "Senha atualizada com sucesso",
      });

      navigate('/dashboard');
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro inesperado ao atualizar senha",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

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
            Nova Senha
          </h2>
          <p className="mt-2 text-sm text-summi-gray-600">
            Digite sua nova senha
          </p>
        </div>

        {/* Form */}
        <Card className="card-hover shadow-xl border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="bg-gradient-to-r from-summi-green/5 to-summi-secondary/5 rounded-t-lg">
            <CardTitle className="text-center text-summi-gray-900">Redefinir Senha</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="password" className="text-summi-gray-700 font-medium">Nova Senha</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="mt-1 border-summi-gray-300 focus:border-summi-green focus:ring-summi-green/20"
                />
              </div>

              <div>
                <Label htmlFor="confirmPassword" className="text-summi-gray-700 font-medium">Confirmar Nova Senha</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="mt-1 border-summi-gray-300 focus:border-summi-green focus:ring-summi-green/20"
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-summi-green to-summi-secondary hover:from-summi-green/90 hover:to-summi-secondary/90 text-white font-medium shadow-lg"
                disabled={isLoading}
              >
                {isLoading ? 'Atualizando...' : 'Atualizar Senha'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
