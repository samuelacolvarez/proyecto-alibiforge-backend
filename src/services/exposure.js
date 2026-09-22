import { ExposureReport } from "../models/ExposureReport.js";
import {
  findCommunityAlibi,
  updateCommunityAlibi,
} from "./alibiCommunity.js";

const EXPOSURE_THRESHOLD = 3;
const EXPOSURE_PENALTY = -10;

export async function applyExposureRules(alibiId) {
  const reportCount = await ExposureReport.countDocuments({
    alibiId: String(alibiId),
  });
  const communityData = await findCommunityAlibi(alibiId);

  if (!communityData) {
    return null;
  }

  const isExposed = reportCount >= EXPOSURE_THRESHOLD;
  const penaltyWasApplied = communityData.alibi.penaltyApplied;
  const penaltyApplied = isExposed && !penaltyWasApplied;

  await updateCommunityAlibi(alibiId, {
    reportCount,
    exposed: isExposed,
    credibilityIndex: isExposed
      ? 0
      : communityData.alibi.credibilityIndex,
    penaltyPoints: isExposed ? EXPOSURE_PENALTY : 0,
    penaltyApplied: isExposed || penaltyWasApplied,
  });

  return { reportCount, isExposed, penaltyApplied };
}
