export function getTranslatedRank(rankName: string, t: any): string {
  if (!rankName || !t) return rankName || "";
  const key = rankName.toLowerCase().trim().replace(/\s+/g, "_");
  if (t.ranks && t.ranks[key]) {
    return t.ranks[key];
  }
  return rankName;
}

export function getTranslatedStatus(status: string, t: any): string {
  if (!status || !t) return status || "";
  const key = status.toLowerCase().trim();
  if (t.status && t.status[key]) {
    return t.status[key];
  }
  if (t.feed && t.feed[key]) {
    return t.feed[key];
  }
  return status.toUpperCase();
}

export function getTranslatedDamageType(damageType: string, t: any): string {
  if (!damageType || !t || !t.report) return (damageType || "").replace(/_/g, " ");
  const key = damageType.toLowerCase().trim();
  switch (key) {
    case "pothole": return t.report.pothole || "Pothole";
    case "crack": return t.report.crack || "Crack";
    case "water_leak":
    case "waterleak": return t.report.waterLeak || "Water Leak";
    case "broken_streetlight":
    case "brokenstreetlight": return t.report.brokenStreetlight || "Broken Streetlight";
    case "garbage_dump":
    case "garbagedump": return t.report.garbageDump || "Garbage Dump";
    case "waterlogging": return t.report.waterlogging || "Waterlogging";
    case "broken_infrastructure":
    case "brokeninfrastructure": return t.report.brokenInfrastructure || "Broken Infrastructure";
    default: return (damageType || "").replace(/_/g, " ");
  }
}
