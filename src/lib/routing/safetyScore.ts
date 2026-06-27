import { DamageType } from '../constants';
import { HAZARD_SEVERITY, getHazardRadius } from './hazardAnalyzer';

export const HAZARD_PENALTIES: Record<DamageType, number> = {
  [DamageType.POTHOLE]: 15,
  [DamageType.WATER_LEAK]: 10,
  [DamageType.BROKEN_STREETLIGHT]: 5,
  [DamageType.GARBAGE_DUMP]: 4,
  [DamageType.WATERLOGGING]: 8,
  [DamageType.CRACK]: 5,
  [DamageType.BROKEN_INFRASTRUCTURE]: 5,
  [DamageType.OTHER]: 5,
};

export function calculateSafetyScore(hazards: any[]): number {
  if (hazards.length === 0) return 100;
  
  let penalty = 0;
  for (const hazard of hazards) {
    const type = hazard.damageType ?? hazard.type;
    const basePenalty = HAZARD_PENALTIES[type as DamageType] || 5;
    const severityMultiplier = hazard.severity ? hazard.severity / 5 : 1;
    penalty += basePenalty * severityMultiplier;
  }
  
  return Math.max(0, Math.min(99, Math.round(100 - penalty)));
}

export function computeSafetyIndex(intersections: any[]): number {
  if (intersections.length === 0) return 100;

  let penalty = 0;
  for (const { hazard, overlapMeters } of intersections) {
    const type = hazard.damageType ?? hazard.type;
    const severity = HAZARD_SEVERITY[type] ?? 6;
    const radius = hazard.radius ?? getHazardRadius(type);
    const diameter = radius * 2;
    // how much of the hazard's full width the route actually cuts through, 0..1
    const exposure = Math.min(1, overlapMeters / diameter);
    penalty += severity * (0.5 + 0.5 * exposure); // even a graze costs at least half the severity weight
  }
  return Math.max(0, Math.round(100 - penalty));
}
