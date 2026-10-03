import { Router } from "express";
import { getRanking } from "../services/rankings.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const rankingsRouter = Router();

rankingsRouter.get(
  "/rankings/:type",
  asyncHandler(async (req, res) => {
    const ranking = await getRanking(req.params.type);

    if (!ranking) {
      throw ApiError.notFound("El tipo de ranking no existe.");
    }

    res.json(ranking);
  })
);
