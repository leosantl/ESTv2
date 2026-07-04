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

export const PLAN_STORAGE_BYTES: Record<PlanId, number> = {
  starter: 1 * 1024 * 1024 * 1024,
  professional: 10 * 1024 * 1024 * 1024,
  enterprise: 100 * 1024 * 1024 * 1024,
};

export const PLAN_STORAGE_LABEL: Record<PlanId, string> = {
  starter: "1 GB",
  professional: "10 GB",
  enterprise: "100 GB",
};

export function getPlanStorageBytes(planId: string | undefined | null): number {
  if (!planId) return PLAN_STORAGE_BYTES.starter;
  return PLAN_STORAGE_BYTES[planId as PlanId] ?? PLAN_STORAGE_BYTES.starter;
}

export function fmtBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}
