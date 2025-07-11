// ABOUTME: Hook para gerenciar integração com Google Calendar
// ABOUTME: Conectar, desconectar, sincronizar e gerenciar calendários

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface UserCalendar {
  id: string;
  user_id: string;
  calendar_id: string;
  calendar_name: string;
  color: string;
  is_enabled: boolean;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export const useGoogleCalendar = () => {
  const [calendars, setCalendars] = useState<UserCalendar[]>([]);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const connectGoogleCalendar = useCallback(async (userId: string) => {
    setIsConnecting(true);
    try {
      const { data, error } = await supabase.functions.invoke('google-calendar-auth', {
        body: { userId }
      });

      if (error) throw error;

      // Abre popup para autorização
      const popup = window.open(
        data.authUrl,
        'google-auth',
        'width=500,height=600,scrollbars=yes'
      );

      // Escuta mensagens do popup
      return new Promise<boolean>((resolve) => {
        const messageListener = (event: MessageEvent) => {
          if (event.data.type === 'GOOGLE_CALENDAR_SUCCESS') {
            toast({
              title: "Sucesso!",
              description: "Google Calendar conectado com sucesso.",
            });
            resolve(true);
          } else if (event.data.type === 'GOOGLE_CALENDAR_ERROR') {
            toast({
              title: "Erro na conexão",
              description: event.data.error || "Erro ao conectar Google Calendar.",
              variant: "destructive",
            });
            resolve(false);
          }
          window.removeEventListener('message', messageListener);
        };

        window.addEventListener('message', messageListener);

        // Verifica se o popup foi fechado manualmente
        const checkClosed = setInterval(() => {
          if (popup?.closed) {
            clearInterval(checkClosed);
            window.removeEventListener('message', messageListener);
            resolve(false);
          }
        }, 1000);
      });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao iniciar conexão com Google Calendar.",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsConnecting(false);
    }
  }, [toast]);

  const disconnectGoogleCalendar = useCallback(async (userId: string) => {
    setIsLoading(true);
    try {
      const { error } = await supabase.functions.invoke('google-calendar-disconnect', {
        body: { userId }
      });

      if (error) throw error;

      setCalendars([]);
      toast({
        title: "Desconectado",
        description: "Google Calendar desconectado com sucesso.",
      });
      return true;
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao desconectar Google Calendar.",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const syncCalendars = useCallback(async (userId: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('google-calendar-sync', {
        body: { userId }
      });

      if (error) throw error;

      setCalendars(data.calendars || []);
      return data.calendars || [];
    } catch (error: any) {
      toast({
        title: "Erro na sincronização",
        description: error.message || "Erro ao sincronizar calendários.",
        variant: "destructive",
      });
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const updateCalendarSettings = useCallback(async (
    calendarId: string, 
    settings: { is_enabled?: boolean; is_default?: boolean }
  ) => {
    try {
      const { error } = await supabase
        .from('user_calendars')
        .update(settings)
        .eq('calendar_id', calendarId);

      if (error) throw error;

      // Se definindo como padrão, remove de outros
      if (settings.is_default) {
        await supabase
          .from('user_calendars')
          .update({ is_default: false })
          .neq('calendar_id', calendarId);
      }

      // Atualiza estado local
      setCalendars(prev => prev.map(cal => 
        cal.calendar_id === calendarId 
          ? { ...cal, ...settings }
          : settings.is_default 
            ? { ...cal, is_default: false }
            : cal
      ));

      return true;
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao atualizar configurações do calendário.",
        variant: "destructive",
      });
      return false;
    }
  }, [toast]);

  const loadUserCalendars = useCallback(async (userId: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_calendars')
        .select('*')
        .eq('user_id', userId)
        .order('is_default', { ascending: false });

      if (error) throw error;

      setCalendars(data || []);
      return data || [];
    } catch (error: any) {
      console.error('Erro ao carregar calendários:', error);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    calendars,
    isConnecting,
    isLoading,
    connectGoogleCalendar,
    disconnectGoogleCalendar,
    syncCalendars,
    updateCalendarSettings,
    loadUserCalendars,
  };
};