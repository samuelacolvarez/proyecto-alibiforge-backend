import { Alibi } from "../models/Alibi.js";
import { ExposureReport } from "../models/ExposureReport.js";
import {
  ALIBI_STATES,
  EXPOSURE_PENALTY,
  EXPOSURE_THRESHOLD,
} from "../utils/constants.js";
import { applyCredibilityChange } from "./userService.js";

// Req. 18 y 19: con 3+ reportes la coartada queda expuesta (Rejected, índice 0)
// y el creador pierde 10 puntos UNA sola vez.
export async function applyExposureRules(alibiId) {
  const reportCount = await ExposureReport.countDocuments({ alibiId });

  if (reportCount < EXPOSURE_THRESHOLD) {
    await Alibi.updateOne({ _id: alibiId }, { reportCount });
    return { reportCount, isExposed: false, penaltyApplied: false };
  }

  // Cambio atómico: solo la petición que pasa penaltyApplied de false a true
  // recibe el documento anterior y aplica la penalización.
  const previous = await Alibi.findOneAndUpdate(
    { _id: alibiId, penaltyApplied: false },
    {
      $set: {
        reportCount,
        exposed: true,
        penaltyApplied: true,
        state: ALIBI_STATES.REJECTED,
        credibilityIndex: 0,
      },
    },
    { new: false }
  );

  if (previous) {
    await applyCredibilityChange(previous.owner, EXPOSURE_PENALTY);
    return { reportCount, isExposed: true, penaltyApplied: true };
  }

  await Alibi.updateOne({ _id: alibiId }, { reportCount });
  return { reportCount, isExposed: true, penaltyApplied: false };
}
