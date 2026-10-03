// Fórmulas puras del Credibility Index (sin base de datos, fáciles de probar).
import { WITNESS_BONUS } from "../utils/constants.js";

export function round2(value) {
  return Math.round(value * 100) / 100;
}

// Req. 10: 3+ detalles = +5, 5+ = +10, 10+ = +20
export function calculateComplexityScore(detailCount) {
  if (detailCount >= 10) return 20;
  if (detailCount >= 5) return 10;
  if (detailCount >= 3) return 5;
  return 0;
}

// Req. 8: promedio de cada voto = (credibility + creativity + consistency) / 3.
// El promedio de la coartada es el promedio de esos promedios (0 si no hay votos).
export function calculateAverageScore(votes) {
  if (!votes || votes.length === 0) return 0;
  const total = votes.reduce(
    (sum, vote) => sum + (vote.credibility + vote.creativity + vote.consistency) / 3,
    0
  );
  return round2(total / votes.length);
}

// Req. 9 y 15: Credibility Index = (promedio * 10) + (testigos * 2) + complejidad.
// Una coartada expuesta (req. 18) siempre queda en 0.
export function calculateCredibilityIndex({
  averageScore = 0,
  witnessCount = 0,
  complexityScore = 0,
  exposed = false,
}) {
  if (exposed) return 0;
  return round2(averageScore * 10 + witnessCount * WITNESS_BONUS + complexityScore);
}
