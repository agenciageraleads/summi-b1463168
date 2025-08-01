// ABOUTME: Wrapper do Sidebar que adiciona highlights para o onboarding
// ABOUTME: Integra o sistema de tutorial com elementos da navegação

import React from 'react';
import { Sidebar } from './Sidebar';
import { OnboardingHighlight } from '@/components/Onboarding';

export const SidebarWithHighlight: React.FC = () => {
  return (
    <>
      <OnboardingHighlight targetId="settings-button">
        <Sidebar />
      </OnboardingHighlight>
    </>
  );
};