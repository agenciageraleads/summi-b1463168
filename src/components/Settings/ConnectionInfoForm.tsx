import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { Profile } from '@/hooks/useProfile';
import { useWhatsAppManager } from '@/hooks/useWhatsAppManager';

interface ConnectionInfoFormProps {
  profile: Profile;
  onSave: (data: Partial<Profile>) => Promise<void>;
  isUpdating: boolean;
}

export const ConnectionInfoForm: React.FC<ConnectionInfoFormProps> = ({
  profile,
  onSave,
  isUpdating,
}) => {
  const { state: waState } = useWhatsAppManager();
  const connectionState = waState.connectionState;

  const formatPhoneNumber = (value: string) => {
    const cleanValue = value.replace(/\D/g, '');

    let phoneNumber = cleanValue;
    if (cleanValue.startsWith('55') && cleanValue.length >= 4) {
      phoneNumber = cleanValue.substring(2);
    }

    if (phoneNumber.length <= 2) return phoneNumber;
    if (phoneNumber.length <= 7) return `(${phoneNumber.slice(0, 2)}) ${phoneNumber.slice(2)}`;
    if (phoneNumber.length <= 11) {
      return `(${phoneNumber.slice(0, 2)}) ${phoneNumber.slice(2, 7)}-${phoneNumber.slice(7)}`;
    }
    return `(${phoneNumber.slice(0, 2)}) ${phoneNumber.slice(2, 7)}-${phoneNumber.slice(7, 11)}`;
  };

  const unformatPhoneNumber = (formattedValue: string) => {
    const cleanValue = formattedValue.replace(/\D/g, '');
    if (cleanValue.length === 11 && !cleanValue.startsWith('55')) {
      return `55${cleanValue}`;
    }
    return cleanValue;
  };

  const [formData, setFormData] = useState({
    nome: profile.nome || '',
    numero: profile.numero || '',
  });

  const [displayNumber, setDisplayNumber] = useState('');

  useEffect(() => {
    const next = {
      nome: profile.nome || '',
      numero: profile.numero || '',
    };
    setFormData(next);
    setDisplayNumber(next.numero ? formatPhoneNumber(next.numero) : '');
  }, [profile]);

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    setDisplayNumber(formatPhoneNumber(inputValue));
    handleInputChange('numero', unformatPhoneNumber(inputValue));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave({
      nome: formData.nome,
      numero: formData.numero,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Dados do WhatsApp</CardTitle>
          <CardDescription>Nome e número usados para conectar seu dispositivo.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {profile.email && (
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" value={profile.email} disabled className="bg-muted" />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="nome">Nome</Label>
            <Input
              id="nome"
              value={formData.nome}
              onChange={(e) => handleInputChange('nome', e.target.value)}
              placeholder="Seu nome completo"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="numero">Número</Label>
            <Input
              id="numero"
              value={displayNumber}
              onChange={handlePhoneChange}
              placeholder="(11) 99999-9999"
              disabled={connectionState === 'already_connected'}
              maxLength={15}
            />
            {connectionState === 'already_connected' && (
              <div className="text-sm text-orange-600">
                Para alterar o número, desconecte primeiro o WhatsApp abaixo.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Button type="submit" className="w-full" disabled={isUpdating}>
        {isUpdating ? 'Salvando...' : 'Salvar dados'}
      </Button>
    </form>
  );
};

