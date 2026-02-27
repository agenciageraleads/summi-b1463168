import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { Chat } from '@/hooks/useChats';
import type { Profile } from '@/hooks/useProfile';
import { Clock, MessageCircle, Sparkles } from 'lucide-react';

interface DashboardMetricsCardsProps {
  chats: Chat[];
  profile: Profile | null;
  isLoading: boolean;
}

const asNumber = (value: unknown): number | null => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
};

const getNested = (obj: unknown, path: Array<string | number>) => {
  let cur: unknown = obj;
  for (const key of path) {
    if (cur == null || typeof cur !== 'object') return undefined;
    cur = (cur as Record<string | number, unknown>)[key];
  }
  return cur;
};

const extractAudioSeconds = (event: Record<string, unknown> | unknown): number => {
  const candidates: Array<Array<string | number>> = [
    ['raw', 'body', 'data', 'message', 'audioMessage', 'seconds'],
    ['raw', 'data', 'message', 'audioMessage', 'seconds'],
    ['raw', 'message', 'audioMessage', 'seconds'],
    ['raw', 'body', 'data', 'message', 'audioMessage', 'duration'],
    ['raw', 'data', 'message', 'audioMessage', 'duration'],
    ['raw', 'message', 'audioMessage', 'duration'],
  ];

  for (const path of candidates) {
    const n = asNumber(getNested(event, path));
    if (n && n > 0 && n < 60 * 60 * 6) return n; // sanity: < 6h
  }

  return 0;
};

export const DashboardMetricsCards = ({ chats, profile, isLoading }: DashboardMetricsCardsProps) => {
  const metrics = useMemo(() => {
    let prioritizedConversations = 0;
    let analyzedMessages = 0;
    let audioSeconds = 0;

    for (const chat of chats) {
      const priority = asNumber((chat as Chat & { prioridade?: unknown }).prioridade) ?? 0;
      if (priority >= 2) prioritizedConversations += 1;

      const events = Array.isArray(chat.conversa) ? chat.conversa : [];
      analyzedMessages += events.length;

      for (const event of events) {
        const messageType = String(event?.message_type ?? event?.messageType ?? '').toLowerCase();
        const isAudio =
          messageType === 'audiomessage' ||
          messageType.includes('audio') ||
          Boolean(getNested(event, ['raw', 'body', 'data', 'message', 'audioMessage'])) ||
          Boolean(getNested(event, ['raw', 'data', 'message', 'audioMessage'])) ||
          Boolean(getNested(event, ['raw', 'message', 'audioMessage']));

        if (!isAudio) continue;
        audioSeconds += extractAudioSeconds(event);
      }
    }

    return {
      prioritizedConversations: prioritizedConversations + (profile?.total_conversas_priorizadas || 0),
      analyzedMessages: analyzedMessages + (profile?.total_mensagens_analisadas || 0),
      audioMinutes: Math.round(audioSeconds / 60) + Math.round((profile?.total_segundos_audio || 0) / 60),
    };
  }, [chats, profile]);

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card>
        <CardHeader className="pb-2">
          <CardDescription className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            Áudios processados
          </CardDescription>
          <CardTitle className="text-2xl">
            {isLoading ? <Skeleton className="h-7 w-24" /> : `${metrics.audioMinutes} min`}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Minutos de áudios transcritos/resumidos.
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardDescription className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-muted-foreground" />
            Conversas priorizadas
          </CardDescription>
          <CardTitle className="text-2xl">
            {isLoading ? <Skeleton className="h-7 w-16" /> : metrics.prioritizedConversations}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Marcadas como importantes/urgentes.
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardDescription className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4 text-muted-foreground" />
            Mensagens analisadas
          </CardDescription>
          <CardTitle className="text-2xl">
            {isLoading ? <Skeleton className="h-7 w-20" /> : metrics.analyzedMessages}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Total de mensagens agregadas nas conversas.
        </CardContent>
      </Card>
    </div>
  );
};

