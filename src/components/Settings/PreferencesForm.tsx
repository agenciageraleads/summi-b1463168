import React, { useEffect, useState } from 'react';
import { Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import type { Profile } from '@/hooks/useProfile';

interface PreferencesFormProps {
  profile: Profile;
  onSave: (data: Partial<Profile>) => Promise<void>;
  isUpdating: boolean;
}

export const PreferencesForm: React.FC<PreferencesFormProps> = ({
  profile,
  onSave,
  isUpdating,
}) => {
  const [formData, setFormData] = useState({
    transcreve_audio_recebido: profile.transcreve_audio_recebido ?? true,
    transcreve_audio_enviado: profile.transcreve_audio_enviado ?? true,
    resume_audio: profile.resume_audio ?? false,
    segundos_para_resumir: profile.segundos_para_resumir ?? 45,
    send_on_reaction: profile.send_on_reaction ?? false,
    send_private_only: profile.send_private_only ?? false,
    'Summi em Audio?': profile['Summi em Audio?'] ?? false,
    apenas_horario_comercial: profile.apenas_horario_comercial ?? true,
  });

  useEffect(() => {
    setFormData({
      transcreve_audio_recebido: profile.transcreve_audio_recebido ?? true,
      transcreve_audio_enviado: profile.transcreve_audio_enviado ?? true,
      resume_audio: profile.resume_audio ?? false,
      segundos_para_resumir: profile.segundos_para_resumir ?? 45,
      send_on_reaction: profile.send_on_reaction ?? false,
      send_private_only: profile.send_private_only ?? false,
      'Summi em Audio?': profile['Summi em Audio?'] ?? false,
      apenas_horario_comercial: profile.apenas_horario_comercial ?? true,
    });
  }, [profile]);

  const handleInputChange = (field: keyof typeof formData, value: boolean | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Preferências</CardTitle>
          <CardDescription>Controle como e quando você recebe o “Summi da Hora” e outros comportamentos.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Guia rápido</AlertTitle>
            <AlertDescription>
              <ul className="list-disc space-y-1 pl-5">
                <li>
                  <span className="font-medium">Summi em Áudio</span> envia o resumo também em áudio (além do texto).
                </li>
                <li>
                  <span className="font-medium">Horário Comercial</span> afeta o envio automático do resumo. Fora do horário, a Summi não envia o “Summi da Hora”.
                </li>
                <li>Você pode ajustar depois — comece simples e refine com o uso.</li>
              </ul>
            </AlertDescription>
          </Alert>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Summi em Áudio</Label>
              <p className="text-sm text-muted-foreground">
                Além do texto, você recebe o “Summi da Hora” em áudio (bom para ouvir rapidamente).
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
                Envia o “Summi da Hora” apenas no horário comercial (geralmente 08h–18h, conforme configuração do sistema).
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
          <CardTitle>Configurações de Áudio</CardTitle>
          <CardDescription>Defina quando transcrever, quando resumir e onde a Summi deve responder.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Escolha seu modo</AlertTitle>
            <AlertDescription>
              <ul className="list-disc space-y-1 pl-5">
                <li>
                  <span className="font-medium">Automático</span>: a Summi transcreve assim que o áudio chega (recebido/enviado).
                </li>
                <li>
                  <span className="font-medium">Por reação ⚡</span>: a Summi só transcreve quando você reagir com ⚡ ao áudio (economiza processamento).
                </li>
                <li>
                  <span className="font-medium">Enviar no privado</span>: ideal para grupos — você recebe no seu WhatsApp privado, citando a mensagem original.
                </li>
                <li>As transcrições/resumos chegam no WhatsApp; a priorização completa aparece no dashboard.</li>
              </ul>
            </AlertDescription>
          </Alert>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base font-medium">⚡ Transcrever apenas ao reagir</Label>
              <div className="text-sm text-muted-foreground">
                1) No WhatsApp, reaja ao áudio com ⚡ <span className="mx-1">•</span> 2) A Summi responde com a transcrição/resumo.
              </div>
            </div>
            <Switch
              checked={formData.send_on_reaction || false}
              onCheckedChange={(checked) => {
                handleInputChange('send_on_reaction', checked);
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
                  ? 'Desabilitado — usando transcrição por reação ⚡'
                  : 'A Summi envia automaticamente a transcrição/resumo quando você receber um áudio.'}
              </div>
            </div>
            <Switch
              checked={formData.transcreve_audio_recebido}
              onCheckedChange={(checked) => {
                handleInputChange('transcreve_audio_recebido', checked);
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
                  ? 'Desabilitado — usando transcrição por reação ⚡'
                  : 'A Summi envia automaticamente a transcrição/resumo quando você enviar um áudio.'}
              </div>
            </div>
            <Switch
              checked={formData.transcreve_audio_enviado}
              onCheckedChange={(checked) => {
                handleInputChange('transcreve_audio_enviado', checked);
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
                Para áudios longos, a Summi envia um resumo em vez da transcrição completa.
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
                onChange={(e) => handleInputChange('segundos_para_resumir', Number(e.target.value))}
              />
              <p className="text-xs text-muted-foreground">
                Ex: 45 = áudios com mais de 45s viram resumo. (Recomendado: 45–60s)
              </p>
            </div>
          )}

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enviar apenas no privado</Label>
              <p className="text-sm text-muted-foreground">
                Transcrições e resumos vão para o seu chat privado, citando a mensagem original (ótimo para grupos).
              </p>
            </div>
            <Switch
              checked={formData.send_private_only}
              onCheckedChange={(checked) => handleInputChange('send_private_only', checked)}
            />
          </div>
        </CardContent>
      </Card>

      <Button type="submit" className="w-full" disabled={isUpdating}>
        {isUpdating ? 'Salvando...' : 'Salvar Preferências'}
      </Button>
    </form>
  );
};
