export const ALIBI_STATES = {
  DRAFT: "Draft",
  SUBMITTED: "Submitted",
  UNDER_REVIEW: "UnderReview",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

export const ALIBI_STATE_VALUES = Object.values(ALIBI_STATES);

// Estados en los que una coartada ya es "pública": se puede votar, reportar,
// sumarse como testigo y aparece en los foros de situaciones.
export const ACTIVE_STATES = [
  ALIBI_STATES.SUBMITTED,
  ALIBI_STATES.UNDER_REVIEW,
  ALIBI_STATES.APPROVED,
];

// Decisiones del endpoint POST /alibis/:id/review y el estado al que llevan.
export const REVIEW_DECISIONS = {
  review: ALIBI_STATES.UNDER_REVIEW,
  approve: ALIBI_STATES.APPROVED,
  reject: ALIBI_STATES.REJECTED,
};

export const SPECIALITIES = [
  "CreativeExcuse",
  "DetailOriented",
  "Improviser",
  "Conspirator",
];

export const MIN_ANCHOR_DETAILS = 3;
export const STORY_MAX_CHARS = 500;

// Req. 20: días de bloqueo cuando la credibilidad queda en negativo
export const BLOCK_DAYS = 7;

// Req. 15: puntos que suma cada testigo al Credibility Index
export const WITNESS_BONUS = 2;
// Req. 18: reportes necesarios para que una coartada quede "expuesta"
export const EXPOSURE_THRESHOLD = 3;
// Req. 19: puntos que pierde el creador de una coartada expuesta
export const EXPOSURE_PENALTY = -10;
// Req. 16: puntos que pierden el dueño y los testigos restantes cuando alguien deserta
export const DEFECTION_PENALTY = -2;
