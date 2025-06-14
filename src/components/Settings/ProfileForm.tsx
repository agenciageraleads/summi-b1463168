
// Formulário completo de perfil com todas as configurações do usuário
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { useProfile } from '@/hooks/useProfile';
import { supabase } from '@/integrations/supabase/client';
import { disconnectWhatsApp } from '@/services/whatsappConnection';

// Schema de validação completo para todas as configurações
const profileFormSchema = z.object({
  nome: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  numero: z.string().min(10, 'Número deve ter pelo menos 10 dígitos').optional().or(z.literal('')),
  transcreve_audio_recebido: z.boolean().default(true),
  transcreve_audio_enviado: z.boolean().default(true),
  resume_audio: z.boolean().default(false),
  segundos_para_resumir: z.number().min(10).max(300).default(45),
  temas_importantes: z.string().optional(),
  temas_urgentes: z.string().optional(),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

export const ProfileForm = () => {
  const { toast } = useToast();
  const { profile, refreshProfile } = useProfile();
  const [isLoading, setIsLoading] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      nome: profile?.nome || '',
      numero: profile?.numero || '',
      transcreve_audio_recebido: profile?.transcreve_audio_recebido ?? true,
      transcreve_audio_enviado: profile?.transcreve_audio_enviado ?? true,
      resume_audio: profile?.resume_audio ?? false,
      segundos_para_resumir: profile?.segundos_para_resumir ?? 45,
      temas_importantes: profile?.temas_importantes || '',
      temas_urgentes: profile?.temas_urgentes || '',
    },
  });

  // Atualizar valores do formulário quando o perfil carregar
  React.useEffect(() => {
    if (profile) {
      form.reset({
        nome: profile.nome || '',
        numero: profile.numero || '',
        transcreve_audio_recebido: profile.transcreve_audio_recebido ?? true,
        transcreve_audio_enviado: profile.transcreve_audio_enviado ?? true,
        resume_audio: profile.resume_audio ?? false,
        segundos_para_resumir: profile.segundos_para_resumir ?? 45,
        temas_importantes: profile.temas_importantes || '',
        temas_urgentes: profile.temas_urgentes || '',
      });
    }
  }, [profile, form]);

  // Salvar todas as configurações do perfil
  const onSubmit = async (values: ProfileFormValues) => {
    setIsLoading(true);
    try {
      console.log('[ProfileForm] Salvando configurações:', values);
      
      const { error } = await supabase
        .from('profiles')
        .update({
          nome: values.nome,
          numero: values.numero || null,
          transcreve_audio_recebido: values.transcreve_audio_recebido,
          transcreve_audio_enviado: values.transcreve_audio_enviado,
          resume_audio: values.resume_audio,
          segundos_para_resumir: values.segundos_para_resumir,
          temas_importantes: values.temas_importantes || null,
          temas_urgentes: values.temas_urgentes || null,
        })
        .eq('id', profile?.id);

      if (error) throw error;

      await refreshProfile();
      toast({
        title: 'Configurações salvas',
        description: 'Todas as suas configurações foram atualizadas com sucesso.',
      });
    } catch (error) {
      console.error('[ProfileForm] Erro ao salvar configurações:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar as configurações. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Desconectar instância do WhatsApp
  const handleDisconnectInstance = async () => {
    if (!profile?.instance_name) {
      toast({
        title: 'Nenhuma instância',
        description: 'Não há instância do WhatsApp para desconectar.',
        variant: 'destructive',
      });
      return;
    }

    setIsDisconnecting(true);
    try {
      console.log('[ProfileForm] Iniciando desconexão da instância...');
      const result = await disconnectWhatsApp();
      
      if (result.success) {
        await refreshProfile();
        toast({
          title: 'Desconectado',
          description: result.message || 'WhatsApp desconectado com sucesso',
        });
      } else {
        toast({
          title: 'Erro na desconexão',
          description: result.error || 'Erro ao desconectar WhatsApp',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('[ProfileForm] Erro ao desconectar instância:', error);
      toast({
        title: 'Erro',
        description: 'Erro inesperado ao desconectar WhatsApp',
        variant: 'destructive',
      });
    } finally {
      setIsDisconnecting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Formulário de Informações Básicas */}
      <Card>
        <CardHeader>
          <CardTitle>Informações Pessoais</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="nome"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome Completo</FormLabel>
                      <FormControl>
                        <Input placeholder="Seu nome completo" {...field} />
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
                          placeholder="5511999999999 (código do país + DDD + número)"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Formato: 55 + DDD + número (apenas números)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Configurações de Transcrição de Áudio */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Configurações de Áudio</h3>
                
                <FormField
                  control={form.control}
                  name="transcreve_audio_recebido"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">
                          Transcrever áudios recebidos
                        </FormLabel>
                        <FormDescription>
                          Converter automaticamente áudios recebidos em texto
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="transcreve_audio_enviado"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">
                          Transcrever áudios enviados
                        </FormLabel>
                        <FormDescription>
                          Converter automaticamente áudios enviados em texto
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="resume_audio"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">
                          Resumir áudios longos
                        </FormLabel>
                        <FormDescription>
                          Criar resumos para áudios mais longos que o tempo configurado
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="segundos_para_resumir"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tempo para resumir (segundos)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="10"
                          max="300"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 45)}
                        />
                      </FormControl>
                      <FormDescription>
                        Áudios acima deste tempo serão resumidos (10-300 segundos)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Configurações de Temas */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Configurações de Temas</h3>
                
                <FormField
                  control={form.control}
                  name="temas_importantes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Temas Importantes</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="orçamentos, material elétrico, material, comprar"
                          className="resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Palavras-chave separadas por vírgula que marcam mensagens como importantes
                      </FormDescription>
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
                          placeholder="urgente, amor, falar com você, me liga, ligar, ligação, retorna"
                          className="resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Palavras-chave separadas por vírgula que marcam mensagens como urgentes
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Button type="submit" disabled={isLoading} className="w-full">
                {isLoading ? 'Salvando...' : 'Salvar Configurações'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Gerenciamento de Instância WhatsApp */}
      {profile?.instance_name && (
        <Card>
          <CardHeader>
            <CardTitle>Gerenciar WhatsApp</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Instância ativa:</strong> {profile.instance_name}
              </p>
            </div>
            
            <Button 
              onClick={handleDisconnectInstance}
              variant="destructive"
              disabled={isDisconnecting}
            >
              {isDisconnecting ? 'Desconectando...' : 'Desconectar WhatsApp'}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
