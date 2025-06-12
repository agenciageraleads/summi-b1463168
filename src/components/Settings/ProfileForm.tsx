
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Profile } from '@/hooks/useProfile';

interface ProfileFormProps {
  profile: Profile;
  onSave: (data: Partial<Profile>) => Promise<void>;
  isUpdating: boolean;
}

export const ProfileForm = ({ profile, onSave, isUpdating }: ProfileFormProps) => {
  const [formData, setFormData] = useState({
    nome: profile.nome || '',
    numero: profile.numero || '',
    transcreve_audio_recebido: profile.transcreve_audio_recebido,
    transcreve_audio_enviado: profile.transcreve_audio_enviado,
    resume_audio: profile.resume_audio,
    segundos_para_resumir: profile.segundos_para_resumir,
    temas_urgentes: profile.temas_urgentes || '',
    temas_importantes: profile.temas_importantes || '',
  });

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Informações Básicas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <span>👤</span>
            <span>Informações Básicas</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome Completo</Label>
              <Input
                id="nome"
                value={formData.nome}
                onChange={(e) => handleInputChange('nome', e.target.value)}
                placeholder="Seu nome completo"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="numero">Número do WhatsApp</Label>
              <Input
                id="numero"
                value={formData.numero}
                onChange={(e) => handleInputChange('numero', e.target.value)}
                placeholder="Ex: 5511999999999"
                required
              />
              <p className="text-xs text-muted-foreground">
                Formato: código do país + DDD + número (sem espaços ou símbolos)
              </p>
            </div>
          </div>

          {profile.instance_name && (
            <div className="space-y-2">
              <Label>ID da Instância</Label>
              <Input
                value={profile.instance_name}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                Este é o identificador único da sua instância no WhatsApp
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Configurações de Áudio */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <span>🎵</span>
            <span>Configurações de Áudio</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Transcrever áudios recebidos</Label>
              <p className="text-sm text-muted-foreground">
                Converte áudios dos clientes em texto automaticamente
              </p>
            </div>
            <Switch
              checked={formData.transcreve_audio_recebido}
              onCheckedChange={(checked) => handleInputChange('transcreve_audio_recebido', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Transcrever áudios enviados</Label>
              <p className="text-sm text-muted-foreground">
                Converte seus áudios em texto para histórico
              </p>
            </div>
            <Switch
              checked={formData.transcreve_audio_enviado}
              onCheckedChange={(checked) => handleInputChange('transcreve_audio_enviado', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Resumir áudios longos</Label>
              <p className="text-sm text-muted-foreground">
                Cria resumos automáticos de áudios longos
              </p>
            </div>
            <Switch
              checked={formData.resume_audio}
              onCheckedChange={(checked) => handleInputChange('resume_audio', checked)}
            />
          </div>

          {formData.resume_audio && (
            <div className="space-y-2">
              <Label htmlFor="segundos_para_resumir">
                Resumir áudios com mais de (segundos)
              </Label>
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

      {/* Configurações de Prioridade */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <span>⚡</span>
            <span>Classificação de Mensagens</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="temas_urgentes">Temas Urgentes</Label>
            <Textarea
              id="temas_urgentes"
              value={formData.temas_urgentes}
              onChange={(e) => handleInputChange('temas_urgentes', e.target.value)}
              placeholder="Palavras-chave que indicam urgência (separadas por vírgula)"
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              Mensagens com essas palavras serão marcadas como urgentes
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="temas_importantes">Temas Importantes</Label>
            <Textarea
              id="temas_importantes"
              value={formData.temas_importantes}
              onChange={(e) => handleInputChange('temas_importantes', e.target.value)}
              placeholder="Palavras-chave que indicam importância (separadas por vírgula)"
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              Mensagens com essas palavras serão marcadas como importantes
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Botão Salvar */}
      <div className="flex justify-end">
        <Button 
          type="submit" 
          disabled={isUpdating}
          className="bg-summi-blue hover:bg-summi-blue-dark"
        >
          {isUpdating ? 'Salvando...' : 'Salvar Configurações'}
        </Button>
      </div>
    </form>
  );
};
