import { supabase } from '@/integrations/supabase/client';

type GrowthContext = {
  leadKey: string;
  source: string | null;
  medium: string | null;
  campaign: string | null;
  content: string | null;
  term: string | null;
  referralCode: string | null;
};

type TrackGrowthOptions = {
  planContext?: string;
  dedupeKey?: string;
  metadata?: Record<string, unknown>;
  oncePerSessionKey?: string;
};

const STORAGE_KEY = 'summi:growth-context';

const readSearchValue = (params: URLSearchParams, keys: string[]): string | null => {
  for (const key of keys) {
    const value = params.get(key)?.trim();
    if (value) return value;
  }
  return null;
};

const createLeadKey = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `lead_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
};

const readStoredContext = (): Partial<GrowthContext> => {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Partial<GrowthContext>;
  } catch {
    return {};
  }
};

const persistContext = (context: GrowthContext) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(context));
};

export const ensureLeadContextFromWindow = (): GrowthContext => {
  const stored = readStoredContext();
  const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams();

  const context: GrowthContext = {
    leadKey: stored.leadKey || createLeadKey(),
    source: readSearchValue(params, ['utm_source']) ?? stored.source ?? null,
    medium: readSearchValue(params, ['utm_medium']) ?? stored.medium ?? null,
    campaign: readSearchValue(params, ['utm_campaign']) ?? stored.campaign ?? null,
    content: readSearchValue(params, ['utm_content']) ?? stored.content ?? null,
    term: readSearchValue(params, ['utm_term']) ?? stored.term ?? null,
    referralCode:
      readSearchValue(params, ['ref', 'referral', 'referralCode']) ?? stored.referralCode ?? null,
  };

  persistContext(context);
  return context;
};

export const getLeadContext = (): GrowthContext => ensureLeadContextFromWindow();

export const trackGrowthEvent = async (
  eventType: string,
  options: TrackGrowthOptions = {},
): Promise<void> => {
  if (typeof window === 'undefined') return;

  const context = ensureLeadContextFromWindow();
  if (options.oncePerSessionKey) {
    const sessionKey = `summi:growth-session:${options.oncePerSessionKey}`;
    if (window.sessionStorage.getItem(sessionKey)) return;
    window.sessionStorage.setItem(sessionKey, '1');
  }

  const { error } = await supabase.functions.invoke('track-growth-event', {
    body: {
      eventType,
      leadKey: context.leadKey,
      source: context.source,
      medium: context.medium,
      campaign: context.campaign,
      content: context.content,
      term: context.term,
      referralCode: context.referralCode,
      planContext: options.planContext,
      dedupeKey: options.dedupeKey,
      metadata: options.metadata ?? {},
    },
  });

  if (error) {
    console.warn('[growthTracking] failed to track event', { eventType, error });
  }
};
