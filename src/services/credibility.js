import { Alibi } from "../models/Alibi.js";
import { Vote } from "../models/Vote.js";
import {
  calculateAverageScore,
  calculateCredibilityIndex,
} from "./credibilityFormula.js";

// Recalcula promedio, número de votos y Credibility Index de una coartada real.
export async function recalculateAlibi(alibiId) {
  const [alibi, votes] = await Promise.all([
    Alibi.findById(alibiId),
    Vote.find({ alibiId }).lean(),
  ]);

  if (!alibi) return null;

  const averageScore = calculateAverageScore(votes);
  const credibilityIndex = calculateCredibilityIndex({
    averageScore,
    witnessCount: alibi.witnessCount,
    complexityScore: alibi.complexityScore,
    exposed: alibi.exposed,
  });

  return Alibi.findByIdAndUpdate(
    alibiId,
    { averageScore, voteCount: votes.length, credibilityIndex },
    { new: true }
  );
}
