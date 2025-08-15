
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface Chat {
  id: string;
  id_usuario: string;
  remote_jid: string;
  nome: string;
  prioridade: string;
  criado_em: string;
  modificado_em: string;
  contexto?: string;
  analisado_em?: string;
  conversa: any[];
}

export const useChats = () => {
  const [chats, setChats] = useState<Chat[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  const fetchChats = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('chats')
        .select('*')
        .eq('id_usuario', user.id)
        .order('modificado_em', { ascending: false });

      if (error) throw error;
      
      // Transform the data to ensure conversa is always an array
      const transformedData = (data || []).map(chat => ({
        ...chat,
        conversa: Array.isArray(chat.conversa) ? chat.conversa : []
      }));
      
      setChats(transformedData);
    } catch (error) {
      console.error('Error fetching chats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const createChat = async (chatData: Omit<Chat, 'id' | 'id_usuario' | 'criado_em' | 'modificado_em'>) => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('chats')
        .insert([{ ...chatData, id_usuario: user.id }])
        .select()
        .single();

      if (error) throw error;
      await fetchChats(); // Refresh the list
      return data;
    } catch (error) {
      console.error('Error creating chat:', error);
      return null;
    }
  };

  const updateChat = async (chatId: string, updates: Partial<Chat>) => {
    try {
      const { error } = await supabase
        .from('chats')
        .update(updates)
        .eq('id', chatId);

      if (error) throw error;
      await fetchChats(); // Refresh the list
    } catch (error) {
      console.error('Error updating chat:', error);
    }
  };

  const deleteChat = async (chatId: string) => {
    try {
      const { error } = await supabase
        .from('chats')
        .delete()
        .eq('id', chatId);

      if (error) throw error;
      await fetchChats(); // Refresh the list
      return true;
    } catch (error) {
      console.error('Error deleting chat:', error);
      return false;
    }
  };

  const deleteAllChats = async () => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('chats')
        .delete()
        .eq('id_usuario', user.id);

      if (error) throw error;
      await fetchChats(); // Refresh the list
      return true;
    } catch (error) {
      console.error('Error deleting all chats:', error);
      return false;
    }
  };

  useEffect(() => {
    fetchChats();
  }, [user]);

  return {
    chats,
    isLoading,
    fetchChats,
    createChat,
    updateChat,
    deleteChat,
    deleteAllChats
  };
};
