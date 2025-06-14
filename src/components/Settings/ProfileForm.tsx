
// Atualizar para usar o serviço unificado na desconexão
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { useProfile } from '@/hooks/useProfile';
import { supabase } from '@/integrations/supabase/client';
import { disconnectWhatsApp } from '@/services/whatsappConnection';

const profileFormSchema = z.object({
  nome: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  numero: z.string().min(10, 'Número deve ter pelo menos 10 dígitos').optional().or(z.literal('')),
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
    },
  });

  React.useEffect(() => {
    if (profile) {
      form.reset({
        nome: profile.nome || '',
        numero: profile.numero || '',
      });
    }
  }, [profile, form]);

  const onSubmit = async (values: ProfileFormValues) => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          nome: values.nome,
          numero: values.numero || null,
        })
        .eq('id', profile?.id);

      if (error) throw error;

      await refreshProfile();
      toast({
        title: 'Perfil atualizado',
        description: 'Suas informações foram salvas com sucesso.',
      });
    } catch (error) {
      console.error('Erro ao atualizar perfil:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar o perfil. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

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
      {/* Formulário de Perfil */}
      <Card>
        <CardHeader>
          <CardTitle>Informações do Perfil</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="nome"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome</FormLabel>
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
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Salvando...' : 'Salvar alterações'}
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
