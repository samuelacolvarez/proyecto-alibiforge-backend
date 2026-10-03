import { Router } from "express";
import { Alibi } from "../models/Alibi.js";
import { Vote } from "../models/Vote.js";
import { requireAuth } from "../middleware/auth.js";
import { recalculateAlibi } from "../services/credibility.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ACTIVE_STATES, ALIBI_STATES } from "../utils/constants.js";

export const votesRouter = Router();

function ratingIsValid(value) {
  return Number.isInteger(Number(value)) && Number(value) >= 1 && Number(value) <= 5;
}

votesRouter.get(
  "/alibis/:id/votes",
  asyncHandler(async (req, res) => {
    const alibi = await Alibi.findById(req.params.id);

    if (!alibi) {
      throw ApiError.notFound("Coartada no encontrada.");
    }

    const votes = await Vote.find({ alibiId: alibi._id }).sort({ createdAt: -1 });

    res.json({
      votes: votes.map((vote) => vote.toJSON()),
      credibilityIndex: alibi.credibilityIndex,
      averageScore: alibi.averageScore,
      voteCount: alibi.voteCount,
    });
  })
);

//El votante es el usuario del JWT (no se acepta un id en el body).
votesRouter.post(
  "/alibis/:id/votes",
  requireAuth,
  asyncHandler(async (req, res) => {
    const alibi = await Alibi.findById(req.params.id);

    if (!alibi) {
      throw ApiError.notFound("Coartada no encontrada.");
    }
    if (alibi.owner.toString() === req.user.id) {
      throw ApiError.forbidden("No puedes votar tu propia coartada.");
    }
    if (alibi.exposed || !ACTIVE_STATES.includes(alibi.state)) {
      throw ApiError.conflict(
        "Solo se pueden votar coartadas enviadas que no estén rechazadas ni expuestas."
      );
    }

    const ratingFields = ["credibility", "creativity", "consistency"];

    if (ratingFields.some((field) => !ratingIsValid(req.body[field]))) {
      throw ApiError.badRequest(
        "Las tres calificaciones deben ser números enteros entre 1 y 5."
      );
    }

    const previousVote = await Vote.exists({ alibiId: alibi._id, voterId: req.user._id });

    if (previousVote) {
      throw ApiError.conflict("Ya votaste por esta coartada.");
    }

    const vote = await Vote.create({
      alibiId: alibi._id,
      voterId: req.user._id,
      credibility: Number(req.body.credibility),
      creativity: Number(req.body.creativity),
      consistency: Number(req.body.consistency),
    });

    // El primer voto pasa la coartada de Submitted a UnderReview.
    if (alibi.state === ALIBI_STATES.SUBMITTED) {
      await Alibi.updateOne(
        { _id: alibi._id, state: ALIBI_STATES.SUBMITTED },
        { state: ALIBI_STATES.UNDER_REVIEW }
      );
    }

    const updated = await recalculateAlibi(alibi._id);

    res.status(201).json({
      message: "Voto registrado correctamente.",
      vote: vote.toJSON(),
      credibilityIndex: updated.credibilityIndex,
      averageScore: updated.averageScore,
      voteCount: updated.voteCount,
      state: updated.state,
    });
  })
);
