import { Alibi } from "../models/Alibi.js";
import { AlibiDetail } from "../models/AlibiDetail.js";
import { Witness } from "../models/Witness.js";
import { ApiError } from "../utils/ApiError.js";
import { ALIBI_STATES, MIN_ANCHOR_DETAILS } from "../utils/constants.js";

// Definimos que transiciones de estado son válidas. Cualquier otra se rechaza.
const VALID_TRANSITIONS = {
  [ALIBI_STATES.DRAFT]: [ALIBI_STATES.SUBMITTED],
  [ALIBI_STATES.SUBMITTED]: [ALIBI_STATES.UNDER_REVIEW, ALIBI_STATES.REJECTED],
  [ALIBI_STATES.UNDER_REVIEW]: [ALIBI_STATES.APPROVED, ALIBI_STATES.REJECTED],
  [ALIBI_STATES.APPROVED]: [ALIBI_STATES.REJECTED],
  [ALIBI_STATES.REJECTED]: [],
};

export function assertValidTransition(fromState, toState) {
  const allowed = VALID_TRANSITIONS[fromState] || [];
  if (!allowed.includes(toState)) {
    throw ApiError.badRequest(
      `No se puede pasar de ${fromState} a ${toState}.`
    );
  }
}

// ---- Complexity Score -------------------------------------------------
export function calculateComplexityScore(detailCount) {
  if (detailCount >= 10) return 20;
  if (detailCount >= 5) return 10;
  if (detailCount >= 3) return 5;
  return 0;
}

// Recalcula y guarda los contadores denormalizados de una coartada.
// Se llama cada vez que cambia la cantidad de detalles o de testigos.
export async function recalculateAlibiCounters(alibiId) {
  const [detailCount, witnessCount] = await Promise.all([
    AlibiDetail.countDocuments({ alibi: alibiId }),
    Witness.countDocuments({ alibi: alibiId }),
  ]);

  const alibi = await Alibi.findByIdAndUpdate(
    alibiId,
    {
      detailCount,
      witnessCount,
      complexityScore: calculateComplexityScore(detailCount),
    },
    { new: true }
  );

  return alibi;
}

// Valida que una coartada tenga el mínimo de detalles antes de enviarla.
export async function assertCanSubmit(alibiId) {
  const detailCount = await AlibiDetail.countDocuments({ alibi: alibiId });
  if (detailCount < MIN_ANCHOR_DETAILS) {
    throw ApiError.badRequest(
      `Necesitas al menos ${MIN_ANCHOR_DETAILS} detalles ancla para enviar la coartada.`
    );
  }
}
