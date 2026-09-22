export const ALIBI_STATES = {
  DRAFT: "Draft",
  SUBMITTED: "Submitted",
  UNDER_REVIEW: "UnderReview",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

export const ALIBI_STATE_VALUES = Object.values(ALIBI_STATES);

export const SPECIALITIES = [
  "CreativeExcuse",
  "DetailOriented",
  "Improviser",
  "Conspirator",
];

export const MIN_ANCHOR_DETAILS = 3;
export const STORY_MAX_CHARS = 500;

// Días de bloqueo cuando la credibilidad queda en negativo
export const BLOCK_DAYS = 7;
