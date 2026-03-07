import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

export type GrowthEventInput = {
  dedupeKey?: string | null;
  leadKey?: string | null;
  userId?: string | null;
  eventType: string;
  planContext?: string | null;
  source?: string | null;
  medium?: string | null;
  campaign?: string | null;
  content?: string | null;
  term?: string | null;
  referralCode?: string | null;
  metadata?: Record<string, unknown> | null;
  occurredAt?: string | null;
};

export type AttributionContext = {
  leadKey: string | null;
  source: string | null;
  medium: string | null;
  campaign: string | null;
  content: string | null;
  term: string | null;
  referralCode: string | null;
};

const toNullableString = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export const extractAttribution = (payload: Record<string, unknown> | null | undefined): AttributionContext => ({
  leadKey: toNullableString(payload?.leadKey) ?? toNullableString(payload?.lead_key),
  source: toNullableString(payload?.source) ?? toNullableString(payload?.utm_source),
  medium: toNullableString(payload?.medium) ?? toNullableString(payload?.utm_medium),
  campaign: toNullableString(payload?.campaign) ?? toNullableString(payload?.utm_campaign),
  content: toNullableString(payload?.content) ?? toNullableString(payload?.utm_content),
  term: toNullableString(payload?.term) ?? toNullableString(payload?.utm_term),
  referralCode:
    toNullableString(payload?.referralCode) ??
    toNullableString(payload?.referral_code) ??
    toNullableString(payload?.ref),
});

export const findLatestLeadKeyForUser = async (
  supabaseAdmin: SupabaseClient,
  userId: string,
): Promise<string | null> => {
  const { data, error } = await supabaseAdmin
    .from("growth_events")
    .select("lead_key")
    .eq("user_id", userId)
    .not("lead_key", "is", null)
    .order("occurred_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.warn("[growth] failed to read latest lead_key", { userId, error });
    return null;
  }

  return toNullableString(data?.lead_key);
};

export const insertGrowthEvent = async (
  supabaseAdmin: SupabaseClient,
  input: GrowthEventInput,
): Promise<void> => {
  const row = {
    dedupe_key: toNullableString(input.dedupeKey),
    lead_key: toNullableString(input.leadKey),
    user_id: toNullableString(input.userId),
    event_type: input.eventType,
    plan_context: toNullableString(input.planContext),
    source: toNullableString(input.source),
    medium: toNullableString(input.medium),
    campaign: toNullableString(input.campaign),
    content: toNullableString(input.content),
    term: toNullableString(input.term),
    referral_code: toNullableString(input.referralCode)?.toUpperCase() ?? null,
    metadata: input.metadata ?? {},
    occurred_at: toNullableString(input.occurredAt) ?? new Date().toISOString(),
  };

  const { error } = await supabaseAdmin
    .from("growth_events")
    .upsert(row, { onConflict: "dedupe_key", ignoreDuplicates: true });

  if (error) {
    throw error;
  }
};
