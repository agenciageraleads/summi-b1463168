
// ABOUTME: Tour de onboarding sem menções a trial ou assinatura
// ABOUTME: Foca apenas na funcionalidade da aplicação

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useOnboarding } from '@/hooks/useOnboarding';
import { ChevronLeft, ChevronRight, X, SkipForward, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const OnboardingTour: React.FC = () => {
  const {
    isOnboardingActive,
    currentStep,
    steps,
    nextStep,
    previousStep,
    skipOnboarding,
    totalSteps
  } = useOnboarding();
  
  const navigate = useNavigate();

  if (!isOnboardingActive) return null;

  const currentStepData = steps[currentStep];
  const progress = ((currentStep + 1) / totalSteps) * 100;

  return (
    <Dialog open={isOnboardingActive} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center space-x-2">
              <span className="text-2xl">{currentStepData.icon}</span>
              <span>{currentStepData.title}</span>
            </DialogTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={skipOnboarding}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Progresso */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">
                Passo {currentStep + 1} de {totalSteps}
              </span>
              <Badge variant="secondary">
                {Math.round(progress)}% completo
              </Badge>
            </div>
            <Progress value={progress} className="w-full" />
          </div>

          {/* Conteúdo do passo atual */}
          <div className="bg-muted/50 rounded-lg p-4">
            <p className="text-foreground leading-relaxed">
              {currentStepData.description}
            </p>
          </div>

          {/* Botão de ação se disponível */}
          {currentStepData.actionText && currentStepData.actionPath && (
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
              <Button 
                onClick={() => {
                  navigate(currentStepData.actionPath!);
                  // Fechar o tutorial temporariamente para o usuário navegar
                }} 
                className="w-full"
                variant="default"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                {currentStepData.actionText}
              </Button>
              <p className="text-sm text-muted-foreground mt-2">
                Após completar esta etapa, você pode continuar o tutorial.
              </p>
            </div>
          )}

          {/* Destacar elemento alvo se existir */}
          {currentStepData.target && !currentStepData.actionPath && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                💡 <strong>Dica:</strong> Procure pelo elemento destacado na tela para seguir este passo.
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="flex justify-between">
          <div className="flex space-x-2">
            <Button
              variant="outline"
              onClick={previousStep}
              disabled={currentStep === 0}
              size="sm"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Anterior
            </Button>
            
            <Button
              variant="ghost"
              onClick={skipOnboarding}
              size="sm"
              className="text-muted-foreground"
            >
              <SkipForward className="w-4 h-4 mr-1" />
              Pular Tutorial
            </Button>
          </div>

          <Button onClick={nextStep} size="sm">
            {currentStep === totalSteps - 1 ? (
              <>
                Finalizar
                <ChevronRight className="w-4 h-4 ml-1" />
              </>
            ) : (
              <>
                Próximo
                <ChevronRight className="w-4 h-4 ml-1" />
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
