import { Router } from "express";
import mongoose from "mongoose";
import { Situation } from "../models/Situation.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const situationsRouter = Router();

function escapeRegularExpression(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

situationsRouter.get(
  "/situations",
  asyncHandler(async (req, res) => {
    const search = String(req.query.search || "").trim();
    const filter = search
      ? { title: { $regex: escapeRegularExpression(search), $options: "i" } }
      : {};
    const situations = await Situation.find(filter).sort({ createdAt: -1 }).lean();

    res.json(situations);
  })
);

situationsRouter.get(
  "/situations/:id",
  asyncHandler(async (req, res) => {
    if (!mongoose.isObjectIdOrHexString(req.params.id)) {
      throw ApiError.notFound("La situación no existe.");
    }

    const situation = await Situation.findById(req.params.id).lean();

    if (!situation) {
      throw ApiError.notFound("La situación no existe.");
    }

    res.json(situation);
  })
);

situationsRouter.post(
  "/situations",
  asyncHandler(async (req, res) => {
    const title = String(req.body.title || "").trim();
    const description = String(req.body.description || "").trim();

    if (!title || !description) {
      throw ApiError.badRequest("El título y la descripción son obligatorios.");
    }

    const situation = await Situation.create({
      title,
      description,
      alibis: Array.isArray(req.body.alibis) ? req.body.alibis : [],
    });

    res.status(201).json({
      message: "Situación creada correctamente.",
      situation,
    });
  })
);
