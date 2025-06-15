
import React from 'react';
import { useOnboarding } from '@/hooks/useOnboarding';

interface OnboardingHighlightProps {
  targetId: string;
  children: React.ReactNode;
  className?: string;
}

export const OnboardingHighlight: React.FC<OnboardingHighlightProps> = ({
  targetId,
  children,
  className = ''
}) => {
  const { isOnboardingActive, steps, currentStep } = useOnboarding();
  
  const currentStepData = steps[currentStep];
  const isHighlighted = isOnboardingActive && currentStepData?.target === targetId;

  return (
    <div
      id={targetId}
      className={`
        ${className}
        ${isHighlighted ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-background rounded-lg transition-all duration-300' : ''}
      `}
    >
      {children}
    </div>
  );
};
