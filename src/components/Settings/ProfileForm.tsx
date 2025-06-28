
// ABOUTME: Formulário de perfil com validações de segurança aprimoradas
// ABOUTME: Implementa validação de telefone brasileiro e sanitização de entrada
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useProfile } from '@/hooks/useProfile';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';

// Função para validar telefone brasileiro
const validateBrazilianPhone = (phone: string): boolean => {
  if (!phone) return true; // Campo opcional
  const cleanPhone = phone.replace(/\D/g, '');
  return /^55[1-9][1-9][0-9]{8,9}$/.test(cleanPhone);
};

// Função para sanitizar texto
const sanitizeText = (text: string): string => {
  if (!text) return '';
  return text
    .replace(/[<>\"'&]/g, '') // Remove caracteres perigosos
    .trim()
    .substring(0, 255); // Limita tamanho
};

// Schema de validação com Zod
const profileSchema = z.object({
  nome: z.string()
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .max(100, 'Nome deve ter no máximo 100 caracteres')
    .transform(sanitizeText),
  numero: z.string()
    .optional()
    .refine(validateBrazilianPhone, {
      message: 'Número deve seguir o formato brasileiro: 55 + DDD + número (ex: 5511999999999)'
    }),
  temas_importantes: z.string()
    .optional()
    .transform((val) => val ? sanitizeText(val) : val),
  temas_urgentes: z.string()
    .optional()
    .transform((val) => val ? sanitizeText(val) : val),
  transcreve_audio_recebido: z.boolean(),
  transcreve_audio_enviado: z.boolean(),
  resume_audio: z.boolean(),
  segundos_para_resumir: z.number()
    .min(15, 'Mínimo 15 segundos')
    .max(300, 'Máximo 300 segundos'),
  'Summi em Audio?': z.boolean(),
  apenas_horario_comercial: z.boolean()
});

type ProfileFormData = z.infer<typeof profileSchema>;

export const ProfileForm: React.FC = () => {
  const { profile, updateProfile } = useProfile();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      nome: profile?.nome || '',
      numero: profile?.numero || '',
      temas_importantes: profile?.temas_importantes || '',
      temas_urgentes: profile?.temas_urgentes || '',
      transcreve_audio_recebido: profile?.transcreve_audio_recebido ?? true,
      transcreve_audio_enviado: profile?.transcreve_audio_enviado ?? true,
      resume_audio: profile?.resume_audio ?? false,
      segundos_para_resumir: profile?.segundos_para_resumir ?? 45,
      'Summi em Audio?': profile?.['Summi em Audio?'] ?? false,
      apenas_horario_comercial: profile?.apenas_horario_comercial ?? true
    }
  });

  const onSubmit = async (data: ProfileFormData) => {
    setIsSubmitting(true);
    
    try {
      console.log('[ProfileForm] Enviando dados:', data);
      
      // Validação adicional de segurança no frontend
      if (data.numero && !validateBrazilianPhone(data.numero)) {
        toast({
          title: "Erro de validação",
          description: "Formato de telefone inválido. Use: 55 + DDD + número",
          variant: "destructive"
        });
        return;
      }

      const result = await updateProfile(data);
      
      if (result.success) {
        toast({
          title: "Perfil atualizado",
          description: "Suas informações foram salvas com sucesso"
        });
      } else {
        throw new Error(result.error || 'Erro desconhecido');
      }
    } catch (error: any) {
      console.error('[ProfileForm] Erro ao salvar:', error);
      toast({
        title: "Erro ao salvar",
        description: error.message || "Ocorreu um erro inesperado",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!profile) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Informações Pessoais</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="nome"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome Completo *</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Seu nome completo" 
                      {...field}
                      maxLength={100}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="numero"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Número do WhatsApp</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="5511999999999 (com código do país)" 
                      {...field}
                      maxLength={13}
                    />
                  </FormControl>
                  <FormMessage />
                  <p className="text-sm text-gray-500">
                    Formato: 55 + DDD + número (sem espaços ou símbolos)
                  </p>
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Configurações de Mensagens</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="temas_importantes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Temas Importantes</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Palavras-chave para identificar mensagens importantes (separadas por vírgula)"
                      {...field}
                      maxLength={500}
                      rows={3}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="temas_urgentes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Temas Urgentes</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Palavras-chave para identificar mensagens urgentes (separadas por vírgula)"
                      {...field}
                      maxLength={500}
                      rows={3}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Configurações de Áudio</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="transcreve_audio_recebido"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between">
                  <div>
                    <FormLabel>Transcrever áudios recebidos</FormLabel>
                    <p className="text-sm text-gray-500">
                      Converte automaticamente áudios recebidos em texto
                    </p>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="transcreve_audio_enviado"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between">
                  <div>
                    <FormLabel>Transcrever áudios enviados</FormLabel>
                    <p className="text-sm text-gray-500">
                      Converte automaticamente áudios enviados em texto
                    </p>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <Separator />

            <FormField
              control={form.control}
              name="resume_audio"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between">
                  <div>
                    <FormLabel>Resumir áudios longos</FormLabel>
                    <p className="text-sm text-gray-500">
                      Cria resumos automáticos de áudios longos
                    </p>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            {form.watch('resume_audio') && (
              <FormField
                control={form.control}
                name="segundos_para_resumir"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Resumir áudios acima de (segundos)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min={15}
                        max={300}
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 45)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="Summi em Audio?"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between">
                  <div>
                    <FormLabel>Resumos em áudio</FormLabel>
                    <p className="text-sm text-gray-500">
                      Converte resumos de texto em áudio
                    </p>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Configurações Gerais</CardTitle>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="apenas_horario_comercial"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between">
                  <div>
                    <FormLabel>Apenas horário comercial</FormLabel>
                    <p className="text-sm text-gray-500">
                      Processar mensagens apenas em horário comercial (8h-18h)
                    </p>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Button 
          type="submit" 
          className="w-full" 
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Salvando...' : 'Salvar Alterações'}
        </Button>
      </form>
    </Form>
  );
};
