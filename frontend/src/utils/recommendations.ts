import type { Recommendation } from "../types";

export const RECOMMENDATION_LABEL: Record<Recommendation, string> = {
  BUILD: "BUILD",
  BUILD_IF_MANAGED: "BUILD IF MANAGED",
  DONT_BUILD: "DON'T BUILD",
};

export const RECOMMENDATION_SHORT: Record<Recommendation, string> = {
  BUILD: "BUILD",
  BUILD_IF_MANAGED: "MANAGED",
  DONT_BUILD: "DON'T BUILD",
};

export const RECOMMENDATION_COLOR: Record<Recommendation, string> = {
  BUILD: "#00e8a2",
  BUILD_IF_MANAGED: "#f0b429",
  DONT_BUILD: "#ef5b5b",
};

export const RECOMMENDATION_COPY: Record<Recommendation, string> = {
  BUILD: "Demand and grid headroom both clear the threshold. Site is ready for tender.",
  BUILD_IF_MANAGED: "Demand is strong, but the feeder needs load control or staged commissioning.",
  DONT_BUILD: "Demand or grid headroom does not clear the current siting rule. Do not tender yet.",
};

export const RECOMMENDATION_RULE: Record<Recommendation, string> = {
  BUILD: "Demand ≥ 70 and grid capacity ≥ 70",
  BUILD_IF_MANAGED: "Demand ≥ 70 and grid capacity ≥ 40",
  DONT_BUILD: "Demand < 70 or grid capacity < 40",
};
