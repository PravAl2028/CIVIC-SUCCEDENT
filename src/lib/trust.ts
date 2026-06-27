export function calculateNewTrust(
  currentTrust: number,
  action: "verified_report" | "community_verified" | "correct_verification" | "rejected_report"
): number {
  let delta = 0;
  switch (action) {
    case "verified_report":
      delta = 2;
      break;
    case "community_verified":
      delta = 5;
      break;
    case "correct_verification":
      delta = 1;
      break;
    case "rejected_report":
      delta = -10;
      break;
  }
  
  return Math.max(0, Math.min(100, currentTrust + delta));
}
