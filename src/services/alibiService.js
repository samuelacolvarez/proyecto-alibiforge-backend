import { Alibi } from "../models/Alibi.js";
import { AlibiDetail } from "../models/AlibiDetail.js";
import { Witness } from "../models/Witness.js";
import { User } from "../models/User.js";
import { ApiError } from "../utils/ApiError.js";
import { ALIBI_STATES, MIN_ANCHOR_DETAILS } from "../utils/constants.js";
import { calculateComplexityScore } from "./credibilityFormula.js";
import { recalculateAlibi } from "./credibility.js";

export { calculateComplexityScore };

const HEX_ID = /^[0-9a-fA-F]{24}$/;

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

// Recalcula y guarda los contadores denormalizados de una coartada.
// Se llama cada vez que cambia la cantidad de detalles o de testigos.
export async function recalculateAlibiCounters(alibiId) {
  const [detailCount, witnessCount] = await Promise.all([
    AlibiDetail.countDocuments({ alibi: alibiId }),
    Witness.countDocuments({ alibi: alibiId }),
  ]);

  await Alibi.findByIdAndUpdate(alibiId, {
    detailCount,
    witnessCount,
    complexityScore: calculateComplexityScore(detailCount),
  });

  // El Credibility Index depende de testigos y complejidad: se recalcula siempre.
  // Devuelve la coartada ya actualizada.
  return recalculateAlibi(alibiId);
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

// Convierte lo que llegue en `details` en un arreglo de textos limpios.
// Ignora los textos vacíos; rechaza lo que no sea texto.
export function normalizeDetails(details) {
  if (details === undefined || details === null) return [];
  if (!Array.isArray(details)) {
    throw ApiError.badRequest("Los detalles deben enviarse como un arreglo de textos.");
  }

  const clean = [];
  for (const item of details) {
    if (typeof item !== "string") {
      throw ApiError.badRequest("Cada detalle debe ser un texto.");
    }
    const text = item.trim();
    if (text) clean.push(text);
  }
  return clean;
}

// Convierte la lista de testigos (ids o alias) en usuarios reales.
export async function resolveWitnessUsers(identifiers, ownerId) {
  if (identifiers === undefined || identifiers === null) return [];
  if (!Array.isArray(identifiers)) {
    throw ApiError.badRequest("Los testigos deben enviarse como un arreglo de ids o alias.");
  }

  const unique = [...new Set(identifiers.map((value) => String(value).trim()).filter(Boolean))];
  const users = [];

  for (const value of unique) {
    const byId = HEX_ID.test(value) ? await User.findById(value) : null;
    const user = byId ?? (await User.findOne({ alias: value }));

    if (!user) {
      throw ApiError.badRequest(`No existe el usuario testigo "${value}".`);
    }
    if (user.id === String(ownerId)) {
      throw ApiError.badRequest("No puedes ser testigo de tu propia coartada.");
    }
    users.push(user);
  }

  return users;
}

// Guarda una "versión" (foto del contenido actual) de la coartada.
export async function addVersionSnapshot(alibiId) {
  const alibi = await Alibi.findById(alibiId);
  if (!alibi) return null;

  const details = await AlibiDetail.find({ alibi: alibiId }).sort({ createdAt: 1, _id: 1 });

  alibi.versions.push({
    number: alibi.versions.length + 1,
    title: alibi.title,
    situation: alibi.situation,
    story: alibi.story,
    details: details.map((d) => d.text),
  });
  await alibi.save();

  return alibi;
}
