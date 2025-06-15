
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  login: (email: string, password: string) => Promise<{ error?: string }>;
  register: (name: string, email: string, password: string) => Promise<{ error?: string }>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error?: string }>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setLoading] = useState(true);
  const { toast } = useToast();

  // Função para verificar assinatura e sincronizar dados.
  // Nenhum alteração aqui, a lógica interna está correta.
  const checkSubscription = useCallback(async (userId: string) => {
    try {
      console.log('[AUTH] Verificando assinatura para usuário:', userId);
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) return;

      // Chama a função para sincronizar com Stripe
      const { data, error } = await supabase.functions.invoke('check-subscription', {
        headers: {
          Authorization: `Bearer ${sessionData.session.access_token}`,
        },
      });

      if (error) {
        console.error('[AUTH] Erro ao verificar assinatura:', error);
        return;
      }

      console.log('[AUTH] Dados de assinatura sincronizados:', data);
    } catch (error) {
      console.error('[AUTH] Erro na verificação de assinatura:', error);
    }
  }, []);

  useEffect(() => {
    // Corrigido: Primeiro, busca a sessão inicial para evitar tela de login piscando.
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      setLoading(false);

      if (currentUser) {
        // Se já houver um usuário, verificamos a assinatura de forma assíncrona.
        // O uso de setTimeout(..., 0) evita o deadlock, seguindo as boas práticas.
        setTimeout(() => {
          checkSubscription(currentUser.id);
        }, 0);
      }
    });

    // Corrigido: O listener de autenticação agora é mais robusto.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        const currentUser = session?.user ?? null;
        setUser(currentUser);
        setLoading(false); // Garante que o estado de loading seja finalizado.

        // A verificação de assinatura agora só ocorre no evento SIGNED_IN
        // e é feita de forma assíncrona para não bloquear a interface.
        if (event === 'SIGNED_IN' && currentUser) {
          setTimeout(() => {
            checkSubscription(currentUser.id);
          }, 0);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [checkSubscription]);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast({
          title: "Erro no login",
          description: error.message,
          variant: "destructive",
        });
        return { error: error.message };
      }

      toast({
        title: "Login realizado!",
        description: "Bem-vindo de volta!",
      });
      return {};
    } finally {
      setLoading(false);
    }
  };

  const register = async (name: string, email: string, password: string) => {
    setLoading(true);
    try {
      console.log('[AUTH] Iniciando registro com trial automático');
      
      // Chamar a Edge Function para criar usuário + trial
      const { data, error } = await supabase.functions.invoke('handle-signup', {
        body: { name, email, password }
      });

      if (error) {
        console.error('[AUTH] Erro na Edge Function:', error);
        toast({
          title: "Erro no cadastro",
          description: error.message,
          variant: "destructive",
        });
        return { error: error.message };
      }

      if (!data.success) {
        console.error('[AUTH] Erro retornado pela função:', data.error);
        toast({
          title: "Erro no cadastro",
          description: data.error,
          variant: "destructive",
        });
        return { error: data.error };
      }

      // Se o usuário foi criado com sucesso, fazer login automático
      if (data.user && data.session) {
        setUser(data.user);
        setSession(data.session);
        
        toast({
          title: "Conta criada com sucesso! 🎉",
          description: "Seu trial de 7 dias foi ativado automaticamente.",
        });
      } else {
        toast({
          title: "Cadastro realizado!",
          description: "Verifique seu e-mail para confirmar a conta.",
        });
      }
      
      return {};
    } catch (error) {
      console.error('[AUTH] Erro inesperado no registro:', error);
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      toast({
        title: "Erro no cadastro",
        description: message,
        variant: "destructive",
      });
      return { error: message };
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (email: string) => {
    try {
      const redirectUrl = `${window.location.origin}/reset-password`;
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      });

      if (error) {
        toast({
          title: "Erro",
          description: error.message,
          variant: "destructive",
        });
        return { error: error.message };
      }

      toast({
        title: "E-mail enviado!",
        description: "Verifique sua caixa de entrada para redefinir sua senha.",
      });
      return {};
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      return { error: message };
    }
  };

  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        title: "Erro ao sair",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Logout realizado!",
        description: "Até logo!",
      });
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      login, 
      register, 
      logout, 
      resetPassword, 
      isLoading 
    }}>
      {children}
    </AuthContext.Provider>
  );
};
