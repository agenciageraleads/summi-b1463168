export type PlanType = 'monthly' | 'annual';

const PRICE_IDS_BY_PLAN: Record<PlanType, string[]> = {
  monthly: ['price_1T5IoTKyDqE0F1Pt7P0r5WC4'],
  annual: [
    'price_1T5IpBKyDqE0F1PtJEPbmtal',
    'price_1RZ8j9KyDqE0F1PtNvJzdK0F',
  ],
};

const PLAN_DETAILS = {
  monthly: {
    label: 'Mensal',
    activePriceLabel: 'R$ 47,90/mês',
  },
  annual: {
    label: 'Anual',
    activePriceLabel: 'R$ 29,90/mês (cobrado anualmente)',
  },
} as const;

export const getPlanTypeFromPriceId = (priceId: string | null | undefined): PlanType | null => {
  if (!priceId) return null;
  for (const [planType, priceIds] of Object.entries(PRICE_IDS_BY_PLAN) as Array<[PlanType, string[]]>) {
    if (priceIds.includes(priceId)) return planType;
  }
  return null;
};

export const normalizePlanType = (
  planType: string | null | undefined,
  priceId: string | null | undefined,
): PlanType | null => {
  if (planType === 'monthly' || planType === 'annual') return planType;
  return getPlanTypeFromPriceId(priceId);
};

export const getPlanLabel = (planType: PlanType | null | undefined): string | null => {
  if (!planType) return null;
  return PLAN_DETAILS[planType].label;
};

export const getPlanActivePriceLabel = (planType: PlanType | null | undefined): string | null => {
  if (!planType) return null;
  return PLAN_DETAILS[planType].activePriceLabel;
};
