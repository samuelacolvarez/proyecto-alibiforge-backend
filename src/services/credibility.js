import { Vote } from "../models/Vote.js";
import {
  findCommunityAlibi,
  updateCommunityAlibi,
} from "./alibiCommunity.js";

function round(value) {
  return Math.round(value * 100) / 100;
}

export function calculateCredibilityIndex(votes, witnessCount, exposed = false) {
  if (exposed) {
    return 0;
  }

  const witnessBonus = Math.min(Number(witnessCount) * 0.1, 0.5);

  if (votes.length === 0) {
    return round(witnessBonus);
  }

  const ratingsTotal = votes.reduce(
    (total, vote) =>
      total + vote.credibility + vote.creativity + vote.consistency,
    0
  );
  const ratingsAverage = ratingsTotal / (votes.length * 3);

  return round(Math.min(5, ratingsAverage + witnessBonus));
}

export async function recalculateAlibi(alibiId) {
  const communityData = await findCommunityAlibi(alibiId);

  if (!communityData) {
    return null;
  }

  const votes = await Vote.find({ alibiId: String(alibiId) }).lean();
  const credibilityIndex = calculateCredibilityIndex(
    votes,
    communityData.alibi.witnessCount,
    communityData.alibi.exposed
  );

  await updateCommunityAlibi(alibiId, { credibilityIndex });
  return credibilityIndex;
}

export async function updateWitnessCountAndRecalculate(alibiId, witnessCount) {
  const normalizedCount = Math.max(0, Number(witnessCount) || 0);
  await updateCommunityAlibi(alibiId, { witnessCount: normalizedCount });
  return recalculateAlibi(alibiId);
}
