import type { Recommendation } from "../../types";
import { RECOMMENDATION_COLOR, RECOMMENDATION_LABEL, RECOMMENDATION_SHORT } from "../../utils/recommendations";

interface RecommendationBadgeProps {
  value: Recommendation;
  short?: boolean;
}

export function RecommendationBadge({ value, short = false }: RecommendationBadgeProps) {
  const color = RECOMMENDATION_COLOR[value];
  const label = short ? RECOMMENDATION_SHORT[value] : RECOMMENDATION_LABEL[value];
  return (
    <span className="text-[11px] font-semibold tracking-[0.14em]" style={{ color }}>
      {label}
    </span>
  );
}
