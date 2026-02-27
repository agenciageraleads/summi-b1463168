import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Profile } from '@/hooks/useProfile';
import { GoogleCalendarIntegration } from './GoogleCalendarIntegration';
import { useWhatsAppManager } from '@/hooks/useWhatsAppManager';

interface ProfileFormProps {
  profile: Profile;
  onSave: (data: Partial<Profile>) => Promise<void>;
  isUpdating: boolean;
  onRefreshProfile?: () => Promise<void>;
}

export const ProfileForm: React.FC<ProfileFormProps> = ({
  profile,
  onSave,
  isUpdating,
  onRefreshProfile
}) => {
  const { state: waState } = useWhatsAppManager();
  const connectionState = waState.connectionState;
  // Função para formatar número de telefone brasileiro
  const formatPhoneNumber = (value: string) => {
    // Remove tudo que não é dígito
    const cleanValue = value.replace(/\D/g, '');

    // Se começar com 55, remove o código do país para formatação visual
    let phoneNumber = cleanValue;
    if (cleanValue.startsWith('55') && cleanValue.length >= 4) {
      phoneNumber = cleanValue.substring(2);
    }

    // Aplica a máscara (XX) XXXXX-XXXX
    if (phoneNumber.length <= 2) {
      return phoneNumber;
    } else if (phoneNumber.length <= 7) {
      return `(${phoneNumber.slice(0, 2)}) ${phoneNumber.slice(2)}`;
    } else if (phoneNumber.length <= 11) {
      return `(${phoneNumber.slice(0, 2)}) ${phoneNumber.slice(2, 7)}-${phoneNumber.slice(7)}`;
    }
    return `(${phoneNumber.slice(0, 2)}) ${phoneNumber.slice(2, 7)}-${phoneNumber.slice(7, 11)}`;
  };

  // Função para remover a formatação e adicionar o código do país
  const unformatPhoneNumber = (formattedValue: string) => {
    const cleanValue = formattedValue.replace(/\D/g, '');
    // Adiciona o código do país 55 se não tiver
    if (cleanValue.length === 11 && !cleanValue.startsWith('55')) {
      return `55${cleanValue}`;
    }
    return cleanValue;
  };

  // Estados para controlar os valores dos campos
  const [formData, setFormData] = useState({
    nome: profile.nome || '',
    numero: profile.numero || '',
    temas_importantes: profile.temas_importantes || '',
    temas_urgentes: profile.temas_urgentes || '',
    transcreve_audio_recebido: profile.transcreve_audio_recebido ?? true,
    transcreve_audio_enviado: profile.transcreve_audio_enviado ?? true,
    resume_audio: profile.resume_audio ?? false,
    segundos_para_resumir: profile.segundos_para_resumir ?? 45,
    send_on_reaction: profile.send_on_reaction ?? false,
    send_private_only: profile.send_private_only ?? false,
    'Summi em Audio?': profile['Summi em Audio?'] ?? false,
    apenas_horario_comercial: profile.apenas_horario_comercial ?? true
  });

  // Estado para controlar a exibição formatada do número
  const [displayNumber, setDisplayNumber] = useState('');

  // Atualizar formData quando o profile mudar
  useEffect(() => {
    console.log('[PROFILE_FORM] Profile updated, refreshing form data:', profile);
    const newFormData = {
      nome: profile.nome || '',
      numero: profile.numero || '',
      temas_importantes: profile.temas_importantes || '',
      temas_urgentes: profile.temas_urgentes || '',
      transcreve_audio_recebido: profile.transcreve_audio_recebido ?? true,
      transcreve_audio_enviado: profile.transcreve_audio_enviado ?? true,
      resume_audio: profile.resume_audio ?? false,
      segundos_para_resumir: profile.segundos_para_resumir ?? 45,
      send_on_reaction: profile.send_on_reaction ?? false,
      send_private_only: profile.send_private_only ?? false,
      'Summi em Audio?': profile['Summi em Audio?'] ?? false,
      apenas_horario_comercial: profile.apenas_horario_comercial ?? true
    };
    setFormData(newFormData);

    // Atualizar a exibição formatada do número
    if (newFormData.numero) {
      setDisplayNumber(formatPhoneNumber(newFormData.numero));
    }
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('[PROFILE_FORM] Submitting form with data:', formData);
    try {
      await onSave(formData);
      console.log('[PROFILE_FORM] Form submission completed successfully');
    } catch (error) {
      console.error('[PROFILE_FORM] Error during form submission:', error);
    }
  };

  const handleInputChange = (field: keyof typeof formData, value: string | boolean | number) => {
    console.log(`[PROFILE_FORM] Field ${field} changed to:`, value);
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Função especial para lidar com mudanças no número de telefone
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    const formattedValue = formatPhoneNumber(inputValue);
    const unformattedValue = unformatPhoneNumber(inputValue);
    setDisplayNumber(formattedValue);
    handleInputChange('numero', unformattedValue);
  };

  // Função melhorada para lidar com updates do Google Calendar
  const handleGoogleCalendarUpdate = async (updates: Partial<Profile>) => {
    await onSave(updates);
    // Opcional: refresh adicional se fornecido
    if (onRefreshProfile) {
      await onRefreshProfile();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 1. INFORMAÇÕES PESSOAIS */}
      <Card>
        <CardHeader>
          <CardTitle>Informações Pessoais</CardTitle>
          <CardDescription>
            Suas informações básicas de perfil
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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
            <Label htmlFor="numero">Número de WhatsApp</Label>
            <Input
              id="numero"
              value={displayNumber}
              onChange={handlePhoneChange}
              placeholder="(11) 99999-9999"
              disabled={connectionState === 'already_connected'}
              maxLength={15}
            />
            {connectionState === 'already_connected' && (
              <p className="text-sm text-orange-600">
                ⚠️ Para alterar o número, desconecte primeiro o WhatsApp na aba Dashboard
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 2. TEMAS DE INTERESSE */}
      <Card>
        <CardHeader>
          <CardTitle>Temas de Interesse</CardTitle>
          <CardDescription>
            Configure palavras-chave para categorização automática
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="temas_urgentes">Temas Urgentes</Label>
            <Textarea
              id="temas_urgentes"
              value={formData.temas_urgentes}
              onChange={(e) => handleInputChange('temas_urgentes', e.target.value)}
              placeholder="Ex: urgente, amor, falar com você, me liga..."
              className="min-h-[80px]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="temas_importantes">Temas Importantes</Label>
            <Textarea
              id="temas_importantes"
              value={formData.temas_importantes}
              onChange={(e) => handleInputChange('temas_importantes', e.target.value)}
              placeholder="Ex: orçamentos, proposta, comprar..."
              className="min-h-[80px]"
            />
          </div>
        </CardContent>
      </Card>

      {/* GOOGLE CALENDAR INTEGRATION com callback de refresh */}
      <GoogleCalendarIntegration
        profile={profile}
        onUpdate={handleGoogleCalendarUpdate}
      />

      {/* 3. CONFIGURAÇÕES GERAIS DA SUMMI */}
      <Card>
        <CardHeader>
          <CardTitle>Configurações Gerais da Summi</CardTitle>
          <CardDescription>Escolha como Receber seus Relatórios Peródicos (Summis)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Summi em Áudio</Label>
              <p className="text-sm text-muted-foreground">
                Ativar função Summi em áudio
              </p>
            </div>
            <Switch
              checked={formData['Summi em Audio?']}
              onCheckedChange={(checked) => handleInputChange('Summi em Audio?', checked)}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Apenas Horário Comercial</Label>
              <p className="text-sm text-muted-foreground">
                Processar mensagens apenas em horário comercial
              </p>
            </div>
            <Switch
              checked={formData.apenas_horario_comercial}
              onCheckedChange={(checked) => handleInputChange('apenas_horario_comercial', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* 4. CONFIGURAÇÕES DE ÁUDIO */}
      <Card>
        <CardHeader>
          <CardTitle>Configurações de Áudio</CardTitle>
          <CardDescription>
            Configure como os áudios são processados
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Send on Reaction - Nova flag prioritária */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base font-medium">
                ⚡ Transcrever apenas ao reagir
              </Label>
              <div className="text-sm text-muted-foreground">
                Transcrever áudios apenas quando você reagir com o emoji ⚡ na mensagem
              </div>
            </div>
            <Switch
              checked={formData.send_on_reaction || false}
              onCheckedChange={(checked) => {
                handleInputChange('send_on_reaction', checked);
                // Se ativado, desativa as outras flags de transcrição
                if (checked) {
                  handleInputChange('transcreve_audio_recebido', false);
                  handleInputChange('transcreve_audio_enviado', false);
                }
              }}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className={`text-base font-medium ${formData.send_on_reaction ? 'text-muted-foreground' : ''}`}>
                Transcrever áudios recebidos
              </Label>
              <div className="text-sm text-muted-foreground">
                {formData.send_on_reaction
                  ? 'Desabilitado - usando transcrição por reação ⚡'
                  : 'Converter áudios recebidos em texto automaticamente'
                }
              </div>
            </div>
            <Switch
              checked={formData.transcreve_audio_recebido}
              onCheckedChange={(checked) => {
                handleInputChange('transcreve_audio_recebido', checked);
                // Se ativado, desativa send_on_reaction
                if (checked) {
                  handleInputChange('send_on_reaction', false);
                }
              }}
              disabled={formData.send_on_reaction}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className={`text-base font-medium ${formData.send_on_reaction ? 'text-muted-foreground' : ''}`}>
                Transcrever áudios enviados
              </Label>
              <div className="text-sm text-muted-foreground">
                {formData.send_on_reaction
                  ? 'Desabilitado - usando transcrição por reação ⚡'
                  : 'Converter áudios enviados em texto automaticamente'
                }
              </div>
            </div>
            <Switch
              checked={formData.transcreve_audio_enviado}
              onCheckedChange={(checked) => {
                handleInputChange('transcreve_audio_enviado', checked);
                // Se ativado, desativa send_on_reaction
                if (checked) {
                  handleInputChange('send_on_reaction', false);
                }
              }}
              disabled={formData.send_on_reaction}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Resumir áudios</Label>
              <p className="text-sm text-muted-foreground">
                Gerar resumos automáticos dos áudios
              </p>
            </div>
            <Switch
              checked={formData.resume_audio}
              onCheckedChange={(checked) => handleInputChange('resume_audio', checked)}
            />
          </div>

          {formData.resume_audio && (
            <div className="space-y-2">
              <Label htmlFor="segundos_para_resumir">Segundos mínimos para resumir</Label>
              <Input
                id="segundos_para_resumir"
                type="number"
                min="10"
                max="300"
                value={formData.segundos_para_resumir}
                onChange={(e) => handleInputChange('segundos_para_resumir', parseInt(e.target.value))}
              />
            </div>
          )}

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enviar apenas no privado</Label>
              <p className="text-sm text-muted-foreground">
                Transcrições e resumos são enviados apenas no chat privado, referenciando a mensagem original
              </p>
            </div>
            <Switch
              checked={formData.send_private_only}
              onCheckedChange={(checked) => handleInputChange('send_private_only', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* BOTÃO SALVAR - SEMPRE VISÍVEL */}
      <Button type="submit" className="w-full" disabled={isUpdating}>
        {isUpdating ? 'Salvando...' : 'Salvar Alterações'}
      </Button>
    </form>
  );
};
