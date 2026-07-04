export type PlanId = "starter" | "professional" | "enterprise";
export type Feature = "clients"|"weapons"|"ammo"|"range"|"schedule"|"documents"|"finance"|"loja"|"reports";
const PLAN_FEATURES: Record<PlanId, Feature[]> = {
  starter: ["clients","weapons","range","schedule"],
  professional: ["clients","weapons","ammo","range","schedule","documents","finance","reports"],
  enterprise: ["clients","weapons","ammo","range","schedule","documents","finance","reports","loja"],
};
export const FEATURE_MIN_PLAN: Record<Feature, PlanId> = {
  clients:"starter",weapons:"starter",range:"starter",schedule:"starter",
  ammo:"professional",documents:"professional",finance:"professional",reports:"professional",
  loja:"enterprise",
};
export const PLAN_LABEL: Record<PlanId, string> = {
  starter:"Starter", professional:"Professional", enterprise:"Enterprise",
};
export function planHasFeature(planId: string|undefined|null, feature: Feature): boolean {
  if (!planId) return false;
  const features = PLAN_FEATURES[planId as PlanId];
  return features ? features.includes(feature) : false;
}
