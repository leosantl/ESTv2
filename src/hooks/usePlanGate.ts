import { useCompany } from "@/hooks/useSupabase";
import { planHasFeature, type Feature } from "@/lib/plan-features";

export function usePlanGate(companyId: string, feature: Feature) {
  const { data: company } = useCompany(companyId);
  const planId = company?.planId ?? null;
  return { allowed: planHasFeature(planId, feature), planId };
}
