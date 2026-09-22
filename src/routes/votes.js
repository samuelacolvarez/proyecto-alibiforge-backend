import { Router } from "express";
import { Vote } from "../models/Vote.js";
import { findCommunityAlibi } from "../services/alibiCommunity.js";
import { recalculateAlibi } from "../services/credibility.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const votesRouter = Router();

function ratingIsValid(value) {
  return Number.isInteger(Number(value)) && Number(value) >= 1 && Number(value) <= 5;
}

function voterId(body) {
  return String(body.voterId || body.userId || body.visitorId || "").trim();
}

votesRouter.get(
  "/alibis/:id/votes",
  asyncHandler(async (req, res) => {
    const communityData = await findCommunityAlibi(req.params.id);

    if (!communityData) {
      throw ApiError.notFound("La coartada comunitaria no existe.");
    }

    const votes = await Vote.find({ alibiId: String(req.params.id) })
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      votes,
      credibilityIndex: communityData.alibi.credibilityIndex,
    });
  })
);

votesRouter.post(
  "/alibis/:id/votes",
  asyncHandler(async (req, res) => {
    const communityData = await findCommunityAlibi(req.params.id);

    if (!communityData) {
      throw ApiError.notFound("La coartada comunitaria no existe.");
    }

    if (communityData.alibi.exposed) {
      throw ApiError.conflict("No se puede votar por una coartada expuesta.");
    }

    const normalizedVoterId = voterId(req.body);

    if (!normalizedVoterId) {
      throw ApiError.badRequest("Debes enviar voterId, userId o visitorId.");
    }

    const ratingFields = ["credibility", "creativity", "consistency"];

    if (ratingFields.some((field) => !ratingIsValid(req.body[field]))) {
      throw ApiError.badRequest(
        "Las tres calificaciones deben ser números enteros entre 1 y 5."
      );
    }

    const previousVote = await Vote.exists({
      alibiId: String(req.params.id),
      voterId: normalizedVoterId,
    });

    if (previousVote) {
      throw ApiError.conflict("Ya votaste por esta coartada.");
    }

    const vote = await Vote.create({
      alibiId: String(req.params.id),
      voterId: normalizedVoterId,
      credibility: Number(req.body.credibility),
      creativity: Number(req.body.creativity),
      consistency: Number(req.body.consistency),
    });
    const credibilityIndex = await recalculateAlibi(req.params.id);

    res.status(201).json({
      message: "Voto registrado correctamente.",
      vote,
      credibilityIndex,
    });
  })
);
