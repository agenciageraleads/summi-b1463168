import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type UserCostRow = {
  user_id: string;
  date: string;
  cost_openai_usd: number | null;
  transcription_cost_usd: number | null;
  analysis_cost_usd: number | null;
  summary_cost_usd: number | null;
  tts_cost_usd: number | null;
  call_count: number | null;
  audio_minutes: number | null;
};

type CostLogRow = {
  user_id: string;
  created_at: string;
  operation: string;
  model: string | null;
  cost_usd: number | null;
  tokens_total: number | null;
  audio_seconds: number | null;
  char_count: number | null;
};

type GrowthEventRow = {
  user_id: string | null;
  lead_key: string | null;
  event_type: string;
  plan_context: string | null;
  occurred_at: string;
  metadata: Record<string, unknown> | null;
};

type MarketingSpendRow = {
  month_start: string;
  channel: string;
  source: string | null;
  amount_brl: number | null;
};

type SubscriberRow = {
  user_id: string;
  subscription_status: string | null;
  trial_ends_at: string | null;
};

type ProfileRow = {
  id: string;
  email: string | null;
  nome: string | null;
  instance_name: string | null;
};

const toNumber = (value: number | string | null | undefined) => Number(value ?? 0);

const toDate = (value: string) => new Date(`${value}T00:00:00.000Z`);

const startOfUtcDay = (value: Date) => {
  const normalized = new Date(value);
  normalized.setUTCHours(0, 0, 0, 0);
  return normalized;
};

const startOfUtcMonth = (value: Date) => new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), 1));

const addUtcDays = (value: Date, days: number) => {
  const next = new Date(value);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
};

const monthDays = (value: Date) =>
  new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth() + 1, 0)).getUTCDate();

const overlapDays = (rangeStart: Date, rangeEnd: Date, monthStart: Date) => {
  const monthEnd = new Date(Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() + 1, 1));
  const start = Math.max(rangeStart.getTime(), monthStart.getTime());
  const end = Math.min(rangeEnd.getTime(), monthEnd.getTime());
  if (end <= start) return 0;
  return (end - start) / (24 * 60 * 60 * 1000);
};

const identityKey = (row: { user_id: string | null; lead_key: string | null }) =>
  row.user_id || row.lead_key || null;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization") ?? req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ success: false, error: "Token de autorização obrigatório" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const exchangeRate = Number(Deno.env.get("USD_BRL_EXCHANGE_RATE") ?? "5.8");
    const arpuBlendedBrl = Number(Deno.env.get("ARPU_BLENDED_BRL") ?? "42.5");
    const trialSoftCapBrl = Number(Deno.env.get("TRIAL_AI_SOFT_CAP_BRL") ?? "1.0");
    const trialHardCapBrl = Number(Deno.env.get("TRIAL_AI_HARD_CAP_BRL") ?? "1.5");

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });
    const supabaseAuth = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false },
    });

    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    const { data: authData, error: authError } = await supabaseAuth.auth.getUser(token);
    if (authError || !authData.user) {
      return new Response(JSON.stringify({ success: false, error: "Token inválido ou sessão expirada" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: isAdminData, error: adminError } = await supabaseAdmin.rpc("verify_admin_access", {
      user_id: authData.user.id,
    });
    if (adminError || !isAdminData) {
      return new Response(JSON.stringify({ success: false, error: "Apenas administradores podem acessar custos" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const periodDays = body?.period === 7 ? 7 : 30;
    const now = new Date();
    const rangeEnd = addUtcDays(startOfUtcDay(now), 1);
    const since = addUtcDays(startOfUtcDay(now), -periodDays);
    const churnSince = addUtcDays(startOfUtcDay(now), -30);
    const growthSince = addUtcDays(startOfUtcDay(now), -180);

    const sinceDate = since.toISOString().slice(0, 10);
    const sinceTimestamp = since.toISOString();

    const { data: userCostRows, error: userCostsError } = await supabaseAdmin
      .from("user_costs")
      .select("user_id,date,cost_openai_usd,transcription_cost_usd,analysis_cost_usd,summary_cost_usd,tts_cost_usd,call_count,audio_minutes")
      .gte("date", sinceDate)
      .order("date", { ascending: false });

    if (userCostsError) {
      throw userCostsError;
    }

    const { data: costLogs, error: costLogsError } = await supabaseAdmin
      .from("cost_logs")
      .select("user_id,created_at,operation,model,cost_usd,tokens_total,audio_seconds,char_count")
      .gte("created_at", sinceTimestamp)
      .order("created_at", { ascending: false })
      .limit(100);

    if (costLogsError) {
      throw costLogsError;
    }

    const { data: growthEvents, error: growthError } = await supabaseAdmin
      .from("growth_events")
      .select("user_id,lead_key,event_type,plan_context,occurred_at,metadata")
      .gte("occurred_at", growthSince.toISOString())
      .order("occurred_at", { ascending: false });

    if (growthError) {
      throw growthError;
    }

    const { data: marketingSpendRows, error: marketingSpendError } = await supabaseAdmin
      .from("marketing_spend_entries")
      .select("month_start,channel,source,amount_brl")
      .gte("month_start", startOfUtcMonth(since).toISOString().slice(0, 10))
      .order("month_start", { ascending: false });

    if (marketingSpendError) {
      throw marketingSpendError;
    }

    const { data: subscribers, error: subscribersError } = await supabaseAdmin
      .from("subscribers")
      .select("user_id,subscription_status,trial_ends_at");

    if (subscribersError) {
      throw subscribersError;
    }

    const userIds = Array.from(
      new Set(
        [
          ...(userCostRows ?? []).map((row) => row.user_id),
          ...(costLogs ?? []).map((row) => row.user_id),
          ...((growthEvents ?? []).map((row) => row.user_id).filter((value): value is string => !!value)),
          ...((subscribers ?? []).map((row) => row.user_id).filter((value): value is string => !!value)),
        ],
      ),
    );

    const profileMap = new Map<string, ProfileRow>();
    if (userIds.length > 0) {
      const { data: profiles, error: profilesError } = await supabaseAdmin
        .from("profiles")
        .select("id,email,nome,instance_name")
        .in("id", userIds);

      if (profilesError) {
        throw profilesError;
      }

      for (const profile of (profiles ?? []) as ProfileRow[]) {
        profileMap.set(profile.id, profile);
      }
    }

    const dailyMap = new Map<string, Record<string, number | string>>();
    const userMap = new Map<string, Record<string, number | string | null>>();

    for (const row of (userCostRows ?? []) as UserCostRow[]) {
      const daily = dailyMap.get(row.date) ?? {
        date: row.date,
        cost_openai_usd: 0,
        transcription_cost_usd: 0,
        analysis_cost_usd: 0,
        summary_cost_usd: 0,
        tts_cost_usd: 0,
        call_count: 0,
        audio_minutes: 0,
      };
      daily.cost_openai_usd = toNumber(daily.cost_openai_usd) + toNumber(row.cost_openai_usd);
      daily.transcription_cost_usd = toNumber(daily.transcription_cost_usd) + toNumber(row.transcription_cost_usd);
      daily.analysis_cost_usd = toNumber(daily.analysis_cost_usd) + toNumber(row.analysis_cost_usd);
      daily.summary_cost_usd = toNumber(daily.summary_cost_usd) + toNumber(row.summary_cost_usd);
      daily.tts_cost_usd = toNumber(daily.tts_cost_usd) + toNumber(row.tts_cost_usd);
      daily.call_count = toNumber(daily.call_count) + toNumber(row.call_count);
      daily.audio_minutes = toNumber(daily.audio_minutes) + toNumber(row.audio_minutes);
      dailyMap.set(row.date, daily);

      const profile = profileMap.get(row.user_id);
      const user = userMap.get(row.user_id) ?? {
        user_id: row.user_id,
        nome: profile?.nome ?? null,
        email: profile?.email ?? null,
        total_cost_usd: 0,
        transcription_usd: 0,
        analysis_usd: 0,
        summary_usd: 0,
        tts_usd: 0,
        call_count: 0,
        audio_minutes: 0,
      };
      user.total_cost_usd = toNumber(user.total_cost_usd) + toNumber(row.cost_openai_usd);
      user.transcription_usd = toNumber(user.transcription_usd) + toNumber(row.transcription_cost_usd);
      user.analysis_usd = toNumber(user.analysis_usd) + toNumber(row.analysis_cost_usd);
      user.summary_usd = toNumber(user.summary_usd) + toNumber(row.summary_cost_usd);
      user.tts_usd = toNumber(user.tts_usd) + toNumber(row.tts_cost_usd);
      user.call_count = toNumber(user.call_count) + toNumber(row.call_count);
      user.audio_minutes = toNumber(user.audio_minutes) + toNumber(row.audio_minutes);
      userMap.set(row.user_id, user);
    }

    const recentLogs = ((costLogs ?? []) as CostLogRow[]).map((row) => {
      const profile = profileMap.get(row.user_id);
      return {
        ...row,
        email: profile?.email ?? null,
        nome: profile?.nome ?? null,
      };
    });

    const trialStartedInPeriod = ((growthEvents ?? []) as GrowthEventRow[]).filter(
      (row) => row.event_type === "trial_started" && row.occurred_at >= sinceTimestamp,
    );
    const convertedPaidInPeriod = ((growthEvents ?? []) as GrowthEventRow[]).filter(
      (row) => row.event_type === "converted_paid" && row.occurred_at >= sinceTimestamp,
    );
    const cancelRequestedInPeriod = ((growthEvents ?? []) as GrowthEventRow[]).filter(
      (row) => row.event_type === "cancel_requested" && row.occurred_at >= sinceTimestamp,
    );
    const subscriptionCanceled30d = ((growthEvents ?? []) as GrowthEventRow[]).filter(
      (row) => row.event_type === "subscription_canceled" && row.occurred_at >= churnSince.toISOString(),
    );
    const pastDueInPeriod = ((growthEvents ?? []) as GrowthEventRow[]).filter(
      (row) => row.event_type === "past_due" && row.occurred_at >= sinceTimestamp,
    );
    const trialSoftCapHits = ((growthEvents ?? []) as GrowthEventRow[]).filter(
      (row) => row.event_type === "trial_soft_cap_hit" && row.occurred_at >= sinceTimestamp,
    );
    const trialHardCapHits = ((growthEvents ?? []) as GrowthEventRow[]).filter(
      (row) => row.event_type === "trial_hard_cap_hit" && row.occurred_at >= sinceTimestamp,
    );

    const trialIdentitySet = new Set(
      trialStartedInPeriod.map(identityKey).filter((value): value is string => !!value),
    );
    const convertedIdentitySet = new Set(
      convertedPaidInPeriod.map(identityKey).filter((value): value is string => !!value),
    );
    const cancelRequestedUserSet = new Set(
      cancelRequestedInPeriod.map((row) => row.user_id).filter((value): value is string => !!value),
    );
    const canceled30dUserSet = new Set(
      subscriptionCanceled30d.map((row) => row.user_id).filter((value): value is string => !!value),
    );
    const pastDueUserSet = new Set(
      pastDueInPeriod.map((row) => row.user_id).filter((value): value is string => !!value),
    );
    const trialSoftCapUserSet = new Set(
      trialSoftCapHits.map((row) => row.user_id).filter((value): value is string => !!value),
    );
    const trialHardCapUserSet = new Set(
      trialHardCapHits.map((row) => row.user_id).filter((value): value is string => !!value),
    );

    const activatedTrials = new Set<string>();
    for (const row of trialStartedInPeriod) {
      if (!row.user_id) continue;
      const profile = profileMap.get(row.user_id);
      if (profile?.instance_name) {
        activatedTrials.add(row.user_id);
      }
    }

    const trialStartMap = new Map<string, Date>();
    const convertedMap = new Map<string, Date>();
    for (const row of (growthEvents ?? []) as GrowthEventRow[]) {
      if (!row.user_id) continue;
      if (row.event_type === "trial_started" && !trialStartMap.has(row.user_id)) {
        trialStartMap.set(row.user_id, new Date(row.occurred_at));
      }
      if (row.event_type === "converted_paid" && !convertedMap.has(row.user_id)) {
        convertedMap.set(row.user_id, new Date(row.occurred_at));
      }
    }

    let trialAiCostUsd = 0;
    let paidAiCostUsd = 0;
    for (const row of (userCostRows ?? []) as UserCostRow[]) {
      const trialStart = trialStartMap.get(row.user_id);
      const convertedAt = convertedMap.get(row.user_id);
      const costDate = toDate(row.date);
      const isTrialCost =
        !!trialStart &&
        costDate.getTime() >= startOfUtcDay(trialStart).getTime() &&
        (!convertedAt || costDate.getTime() < startOfUtcDay(convertedAt).getTime());

      if (isTrialCost) {
        trialAiCostUsd += toNumber(row.cost_openai_usd);
      } else {
        paidAiCostUsd += toNumber(row.cost_openai_usd);
      }
    }

    let marketingSpendBrl = 0;
    for (const row of (marketingSpendRows ?? []) as MarketingSpendRow[]) {
      const monthStart = toDate(row.month_start);
      const overlappedDays = overlapDays(since, rangeEnd, monthStart);
      if (overlappedDays <= 0) continue;
      marketingSpendBrl += (toNumber(row.amount_brl) * overlappedDays) / monthDays(monthStart);
    }

    const subscribersList = (subscribers ?? []) as SubscriberRow[];
    const activePaidUsers = subscribersList.filter((row) => row.subscription_status === "active").length;
    const costByUserBrl = new Map<string, number>();
    for (const row of (userCostRows ?? []) as UserCostRow[]) {
      costByUserBrl.set(
        row.user_id,
        (costByUserBrl.get(row.user_id) ?? 0) + toNumber(row.cost_openai_usd) * exchangeRate,
      );
    }

    let derivedTrialSoftCapHits = 0;
    let derivedTrialHardCapHits = 0;
    for (const row of subscribersList) {
      const isTrialing =
        row.subscription_status === "trialing" ||
        (row.trial_ends_at ? new Date(row.trial_ends_at).getTime() >= Date.now() : false);
      if (!isTrialing) continue;
      const currentCostBrl = costByUserBrl.get(row.user_id) ?? 0;
      if (currentCostBrl >= trialSoftCapBrl) {
        derivedTrialSoftCapHits += 1;
      }
      if (currentCostBrl >= trialHardCapBrl) {
        derivedTrialHardCapHits += 1;
      }
    }

    const totalAiCostBrl = (trialAiCostUsd + paidAiCostUsd) * exchangeRate;
    const trialAiCostBrl = trialAiCostUsd * exchangeRate;
    const paidAiCostBrl = paidAiCostUsd * exchangeRate;
    const trialsStarted = trialIdentitySet.size;
    const convertedPaid = convertedIdentitySet.size;
    const activationRate = trialsStarted > 0 ? activatedTrials.size / trialsStarted : null;
    const trialToPaidConversion = trialsStarted > 0 ? convertedPaid / trialsStarted : null;
    const churnRate30d = activePaidUsers > 0 ? canceled30dUserSet.size / activePaidUsers : null;
    const trialAiCacBrl = convertedPaid > 0 ? trialAiCostBrl / convertedPaid : null;
    const cacBlendedBrl = convertedPaid > 0 ? (marketingSpendBrl + trialAiCostBrl) / convertedPaid : null;
    const blendedGrossContributionBrl = activePaidUsers * arpuBlendedBrl - totalAiCostBrl - marketingSpendBrl;
    const contributionPerActivePaidBrl = activePaidUsers > 0 ? blendedGrossContributionBrl / activePaidUsers : null;

    return new Response(
      JSON.stringify({
        success: true,
        period: periodDays,
        exchange_rate_brl: exchangeRate,
        assumptions: {
          arpu_blended_brl: arpuBlendedBrl,
        },
        daily_totals: Array.from(dailyMap.values()).sort((a, b) => String(b.date).localeCompare(String(a.date))),
        user_aggregates: Array.from(userMap.values()).sort(
          (a, b) => toNumber(b.total_cost_usd) - toNumber(a.total_cost_usd),
        ),
        recent_logs: recentLogs,
        unit_economics: {
          active_paid_users: activePaidUsers,
          trials_started,
          activations: activatedTrials.size,
          activation_rate: activationRate,
          converted_paid: convertedPaid,
          trial_to_paid_conversion: trialToPaidConversion,
          cancel_requested: cancelRequestedUserSet.size,
          subscription_canceled_30d: canceled30dUserSet.size,
          churn_rate_30d: churnRate30d,
          past_due_users: pastDueUserSet.size,
          trial_soft_cap_hits: Math.max(trialSoftCapUserSet.size, derivedTrialSoftCapHits),
          trial_hard_cap_hits: Math.max(trialHardCapUserSet.size, derivedTrialHardCapHits),
          marketing_spend_brl: marketingSpendBrl,
          trial_ai_cost_brl: trialAiCostBrl,
          paid_ai_cost_brl: paidAiCostBrl,
          total_ai_cost_brl: totalAiCostBrl,
          trial_ai_cac_brl: trialAiCacBrl,
          cac_blended_brl: cacBlendedBrl,
          blended_gross_contribution_brl: blendedGrossContributionBrl,
          contribution_per_active_paid_brl: contributionPerActivePaidBrl,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro interno do servidor";
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
