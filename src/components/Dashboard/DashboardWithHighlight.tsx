// ABOUTME: Wrapper do Dashboard que adiciona highlights para o onboarding
// ABOUTME: Integra elementos do dashboard com o sistema de tutorial

import React from 'react';
import { OnboardingHighlight } from '@/components/Onboarding';

interface DashboardWithHighlightProps {
  children: React.ReactNode;
}

export const DashboardWithHighlight: React.FC<DashboardWithHighlightProps> = ({ children }) => {
  return (
    <div className="space-y-6">
      <OnboardingHighlight targetId="dashboard-link">
        <div className="bg-card rounded-lg p-6 border shadow-sm">
          <h2 className="text-2xl font-bold mb-4 text-foreground">Dashboard</h2>
          <p className="text-muted-foreground mb-6">
            Monitore suas conversas e veja análises automáticas das mensagens importantes.
          </p>
        </div>
      </OnboardingHighlight>
      
      <OnboardingHighlight targetId="chats-section">
        {children}
      </OnboardingHighlight>
    </div>
  );
};