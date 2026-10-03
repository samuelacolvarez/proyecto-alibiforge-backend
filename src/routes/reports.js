import { Router } from "express";
import { Alibi } from "../models/Alibi.js";
import { ExposureReport } from "../models/ExposureReport.js";
import { requireAuth } from "../middleware/auth.js";
import { applyExposureRules } from "../services/exposure.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ACTIVE_STATES } from "../utils/constants.js";

export const reportsRouter = Router();

// El que reporta es el usuario del JWT
reportsRouter.post(
  "/alibis/:id/report",
  requireAuth,
  asyncHandler(async (req, res) => {
    const alibi = await Alibi.findById(req.params.id);

    if (!alibi) {
      throw ApiError.notFound("Coartada no encontrada.");
    }
    if (alibi.owner.toString() === req.user.id) {
      throw ApiError.forbidden("No puedes reportar tu propia coartada.");
    }
    if (alibi.exposed || !ACTIVE_STATES.includes(alibi.state)) {
      throw ApiError.conflict(
        "Solo se pueden reportar coartadas enviadas que no estén rechazadas ni expuestas."
      );
    }

    const previousReport = await ExposureReport.exists({
      alibiId: alibi._id,
      reporterId: req.user._id,
    });

    if (previousReport) {
      throw ApiError.conflict("Ya reportaste esta coartada.");
    }

    const report = await ExposureReport.create({
      alibiId: alibi._id,
      reporterId: req.user._id,
      reason: req.body.reason,
    });
    const exposure = await applyExposureRules(alibi._id);

    res.status(201).json({
      message: exposure.isExposed
        ? "Reporte registrado. La coartada quedó expuesta."
        : `Reporte registrado. Total de reportes: ${exposure.reportCount}.`,
      report: report.toJSON(),
      totalReports: exposure.reportCount,
      isExposed: exposure.isExposed,
      penaltyApplied: exposure.penaltyApplied,
    });
  })
);
