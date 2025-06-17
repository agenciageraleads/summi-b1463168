
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';

// Hook para gerenciar funcionalidades beta
export const useBetaFeatures = () => {
  const { user } = useAuth();
  const { profile } = useProfile();
  const [isBetaUser, setIsBetaUser] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Verificar se o usuário tem acesso às funcionalidades beta
  useEffect(() => {
    const checkBetaAccess = () => {
      if (!user || !profile) {
        setIsBetaUser(false);
        setIsLoading(false);
        return;
      }

      // Usuário tem acesso beta se for admin ou beta
      const hasBetaAccess = profile.role === 'admin' || profile.role === 'beta';
      setIsBetaUser(hasBetaAccess);
      setIsLoading(false);

      console.log(`[Beta] Usuário ${profile.nome} - Role: ${profile.role} - Acesso Beta: ${hasBetaAccess}`);
    };

    checkBetaAccess();
  }, [user, profile]);

  // Função para verificar se uma funcionalidade específica está disponível
  const hasFeatureAccess = (featureName: string): boolean => {
    if (!isBetaUser) return false;

    // Lista de funcionalidades beta disponíveis
    const betaFeatures = [
      'groups-monitoring',
      'advanced-analytics',
      'bulk-operations',
      'custom-integrations',
      'priority-support'
    ];

    return betaFeatures.includes(featureName);
  };

  // Função para obter informações sobre o status beta
  const getBetaStatus = () => {
    if (!profile) return { isActive: false, role: 'user', message: 'Perfil não carregado' };

    return {
      isActive: isBetaUser,
      role: profile.role,
      message: isBetaUser 
        ? 'Você tem acesso às funcionalidades beta!' 
        : 'Você não tem acesso às funcionalidades beta'
    };
  };

  return {
    isBetaUser,
    isLoading,
    hasFeatureAccess,
    getBetaStatus,
    userRole: profile?.role || 'user'
  };
};
