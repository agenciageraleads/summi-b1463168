export type PlanType = "monthly" | "annual";

export const PRICE_ID_BY_PLAN: Record<PlanType, string> = {
  monthly: "price_1T5IoTKyDqE0F1Pt7P0r5WC4",
  annual: "price_1T5IpBKyDqE0F1PtJEPbmtal",
};

const LEGACY_PRICE_IDS_BY_PLAN: Record<PlanType, string[]> = {
  monthly: [],
  annual: ["price_1RZ8j9KyDqE0F1PtNvJzdK0F"],
};

export const getPlanTypeFromPriceId = (priceId: string | null | undefined): PlanType | null => {
  if (!priceId) return null;

  for (const planType of Object.keys(PRICE_ID_BY_PLAN) as PlanType[]) {
    const knownPriceIds = [PRICE_ID_BY_PLAN[planType], ...LEGACY_PRICE_IDS_BY_PLAN[planType]];
    if (knownPriceIds.includes(priceId)) {
      return planType;
    }
  }

  return null;
};
