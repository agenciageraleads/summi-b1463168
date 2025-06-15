
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Profile } from '@/hooks/useProfile';

interface ProfileFormProps {
  profile: Profile;
  onSave: (data: Partial<Profile>) => Promise<void>;
  isUpdating: boolean;
}

export const ProfileForm: React.FC<ProfileFormProps> = ({ profile, onSave, isUpdating }) => {
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
    'Summi em Audio?': profile['Summi em Audio?'] ?? false,
    apenas_horario_comercial: profile.apenas_horario_comercial ?? true
  });

  // Atualizar formData quando o profile mudar
  useEffect(() => {
    console.log('[PROFILE_FORM] Profile updated, refreshing form data:', profile);
    setFormData({
      nome: profile.nome || '',
      numero: profile.numero || '',
      temas_importantes: profile.temas_importantes || '',
      temas_urgentes: profile.temas_urgentes || '',
      transcreve_audio_recebido: profile.transcreve_audio_recebido ?? true,
      transcreve_audio_enviado: profile.transcreve_audio_enviado ?? true,
      resume_audio: profile.resume_audio ?? false,
      segundos_para_resumir: profile.segundos_para_resumir ?? 45,
      'Summi em Audio?': profile['Summi em Audio?'] ?? false,
      apenas_horario_comercial: profile.apenas_horario_comercial ?? true
    });
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

  const handleInputChange = (field: keyof typeof formData, value: any) => {
    console.log(`[PROFILE_FORM] Field ${field} changed to:`, value);
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
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
              value={formData.numero}
              onChange={(e) => handleInputChange('numero', e.target.value)}
              placeholder="55 + DDD + número (ex: 5511999999999)"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Configurações de Áudio</CardTitle>
          <CardDescription>
            Configure como os áudios são processados
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Transcrever áudios recebidos</Label>
              <p className="text-sm text-muted-foreground">
                Converter áudios recebidos em texto automaticamente
              </p>
            </div>
            <Switch
              checked={formData.transcreve_audio_recebido}
              onCheckedChange={(checked) => handleInputChange('transcreve_audio_recebido', checked)}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Transcrever áudios enviados</Label>
              <p className="text-sm text-muted-foreground">
                Converter áudios enviados em texto automaticamente
              </p>
            </div>
            <Switch
              checked={formData.transcreve_audio_enviado}
              onCheckedChange={(checked) => handleInputChange('transcreve_audio_enviado', checked)}
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Configurações Gerais</CardTitle>
          <CardDescription>
            Configurações gerais do sistema
          </CardDescription>
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

      <Card>
        <CardHeader>
          <CardTitle>Temas de Interesse</CardTitle>
          <CardDescription>
            Configure palavras-chave para categorização automática
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="temas_importantes">Temas Importantes</Label>
            <Textarea
              id="temas_importantes"
              value={formData.temas_importantes}
              onChange={(e) => handleInputChange('temas_importantes', e.target.value)}
              placeholder="Ex: orçamentos, material elétrico, comprar..."
              className="min-h-[80px]"
            />
          </div>

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
        </CardContent>
      </Card>

      <Button 
        type="submit" 
        className="w-full" 
        disabled={isUpdating}
      >
        {isUpdating ? 'Salvando...' : 'Salvar Alterações'}
      </Button>
    </form>
  );
};
