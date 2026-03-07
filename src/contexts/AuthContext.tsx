// ABOUTME: Contexto de autenticação: gerencia sessão, login/registro e toasts. Inclui criação de contas via Edge Function com trial de 7 dias.
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { getLeadContext } from '@/lib/growthTracking';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  login: (email: string, password: string) => Promise<{ error?: string }>;
  register: (name: string, email: string, password: string, referralCode?: string) => Promise<{ error?: string }>;
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

  const register = async (name: string, email: string, password: string, referralCode?: string) => {
    setLoading(true);
    try {
      console.log('[AUTH] Iniciando registro via Edge Function com trial de 7 dias');
      const leadContext = getLeadContext();

      // Cria conta e trial no backend (também salva subscritor e bônus por indicação)
      const { data, error } = await supabase.functions.invoke('handle-signup', {
        body: {
          name,
          email,
          password,
          leadKey: leadContext.leadKey,
          source: leadContext.source,
          medium: leadContext.medium,
          campaign: leadContext.campaign,
          content: leadContext.content,
          term: leadContext.term,
          referralCode: referralCode ?? leadContext.referralCode ?? undefined,
        },
      });

      if (error) {
        console.error('[AUTH] Erro no handle-signup:', error);
        toast({
          title: 'Erro no cadastro',
          description: error.message || 'Tente novamente mais tarde.',
          variant: 'destructive',
        });
        return { error: error.message };
      }

      // Realiza login para iniciar sessão local
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) {
        console.warn('[AUTH] Login automático falhou. Pode ser necessário confirmar o e-mail.');
        toast({
          title: 'Conta criada! Confirme seu e-mail',
          description: 'Enviamos um link de confirmação para você.',
        });
        return {};
      }

      toast({
        title: 'Bem-vindo ao Summi! 🎉',
        description: 'Complete seu cadastro escolhendo um plano.',
      });

      // Redirecionar para página de subscription para completar checkout
      setTimeout(() => {
        window.location.href = '/subscription';
      }, 1500);

      return {};
    } catch (error) {
      console.error('[AUTH] Erro inesperado no registro:', error);
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      toast({
        title: 'Erro no cadastro',
        description: message,
        variant: 'destructive',
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
    setLoading(true);
    try {
      // Limpeza completa do estado local primeiro
      setUser(null);
      setSession(null);
      
      // Limpar localStorage (caso haja dados em cache)
      localStorage.clear();
      
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('[AUTH] Erro no logout:', error);
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
      
      // Forçar redirecionamento para página inicial
      setTimeout(() => {
        window.location.href = '/';
      }, 1000);
      
    } catch (error) {
      console.error('[AUTH] Erro inesperado no logout:', error);
      toast({
        title: "Erro ao sair",
        description: "Erro inesperado durante o logout",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
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
