import { Alibi } from "../models/Alibi.js";
import { Witness } from "../models/Witness.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ALIBI_STATES } from "../utils/constants.js";
import { recalculateAlibiCounters } from "../services/alibiService.js";

// GET /alibis/:id/witnesses
export const listWitnesses = asyncHandler(async (req, res) => {
  const witnesses = await Witness.find({ alibi: req.params.id })
    .populate("user", "alias")
    .sort({ createdAt: 1 });

  res.json(witnesses.map((w) => w.toJSON()));
});

// POST /alibis/:id/witnesses  
export const joinChain = asyncHandler(async (req, res) => {
  const alibi = await Alibi.findById(req.params.id);
  if (!alibi) throw ApiError.notFound("Coartada no encontrada.");

  if (alibi.owner.toString() === req.user.id) {
    throw ApiError.badRequest("No puedes ser testigo de tu propia coartada.");
  }
  if (alibi.state === ALIBI_STATES.DRAFT) {
    throw ApiError.badRequest("Esta coartada todavía no fue enviada.");
  }
  if (alibi.state === ALIBI_STATES.REJECTED) {
    throw ApiError.badRequest("No puedes sumarte a una coartada rechazada.");
  }

  const already = await Witness.findOne({ alibi: alibi.id, user: req.user.id });
  if (already) {
    throw ApiError.conflict("Ya eres testigo de esta coartada.");
  }

  await Witness.create({ alibi: alibi.id, user: req.user.id });
  await recalculateAlibiCounters(alibi.id);

  const witnesses = await Witness.find({ alibi: alibi.id }).populate("user", "alias");
  res.status(201).json(witnesses.map((w) => w.toJSON()));
});

// DELETE /alibis/:id/witnesses/me  (defectar)
export const defectFromChain = asyncHandler(async (req, res) => {
  const deleted = await Witness.findOneAndDelete({
    alibi: req.params.id,
    user: req.user.id,
  });

  if (!deleted) {
    throw ApiError.notFound("No eres testigo de esta coartada.");
  }

  await recalculateAlibiCounters(req.params.id);

  const witnesses = await Witness.find({ alibi: req.params.id }).populate("user", "alias");
  res.json(witnesses.map((w) => w.toJSON()));
});
