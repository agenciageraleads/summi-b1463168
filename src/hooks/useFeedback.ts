
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface Feedback {
  id?: string;
  type: 'avaliacao' | 'sugestao' | 'bug';
  title: string;
  description: string;
  rating?: number;
  status?: string;
  created_at?: string;
}

export const useFeedback = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const submitFeedback = async (feedback: Feedback) => {
    if (!user) {
      toast({
        title: 'Erro',
        description: 'Você precisa estar logado para enviar feedback',
        variant: 'destructive'
      });
      return false;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('feedback')
        .insert({
          user_id: user.id,
          type: feedback.type,
          title: feedback.title,
          description: feedback.description,
          rating: feedback.rating
        });

      if (error) throw error;

      toast({
        title: 'Feedback enviado!',
        description: 'Obrigado pelo seu feedback. Nossa equipe irá analisá-lo em breve.'
      });

      return true;
    } catch (error) {
      console.error('Erro ao enviar feedback:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível enviar o feedback. Tente novamente.',
        variant: 'destructive'
      });
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    submitFeedback,
    isSubmitting
  };
};
