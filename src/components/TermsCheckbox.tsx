
import React, { useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { TermsOfService } from './TermsOfService';

interface TermsCheckboxProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  error?: string;
}

export const TermsCheckbox: React.FC<TermsCheckboxProps> = ({
  checked,
  onCheckedChange,
  error
}) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  return (
    <div className="space-y-2">
      <div className="flex items-start space-x-3">
        <Checkbox
          id="terms"
          checked={checked}
          onCheckedChange={onCheckedChange}
          className="mt-1"
        />
        <div className="flex-1">
          <label htmlFor="terms" className="text-sm text-summi-gray-700 leading-relaxed">
            Eu li e concordo com os{' '}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="link"
                  className="p-0 h-auto text-summi-green hover:text-summi-secondary underline"
                >
                  Termos de Uso
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
                <DialogHeader>
                  <DialogTitle className="text-summi-green">
                    Termos de Uso - Summi
                  </DialogTitle>
                </DialogHeader>
                <TermsOfService isModal={true} />
              </DialogContent>
            </Dialog>
            {' '}da plataforma Summi, incluindo a autorização para processar mensagens 
            e enviar respostas automáticas em meu nome.
          </label>
        </div>
      </div>
      {error && (
        <p className="text-red-500 text-sm ml-6">{error}</p>
      )}
    </div>
  );
};
