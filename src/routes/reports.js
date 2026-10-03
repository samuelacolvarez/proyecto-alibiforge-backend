import { Router } from "express";
import { ExposureReport } from "../models/ExposureReport.js";
import { findCommunityAlibi } from "../services/alibiCommunity.js";
import { applyExposureRules } from "../services/exposure.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const reportsRouter = Router();

function reporterId(body) {
  return String(body.reporterId || body.userId || body.visitorId || "").trim();
}

reportsRouter.post(
  "/alibis/:id/report",
  asyncHandler(async (req, res) => {
    const communityData = await findCommunityAlibi(req.params.id);

    if (!communityData) {
      throw ApiError.notFound("La coartada comunitaria no existe.");
    }

    const normalizedReporterId = reporterId(req.body);

    if (!normalizedReporterId) {
      throw ApiError.badRequest(
        "Debes enviar reporterId, userId o visitorId."
      );
    }

    const previousReport = await ExposureReport.exists({
      alibiId: String(req.params.id),
      reporterId: normalizedReporterId,
    });

    if (previousReport) {
      throw ApiError.conflict("Ya reportaste esta coartada.");
    }

    const report = await ExposureReport.create({
      alibiId: String(req.params.id),
      reporterId: normalizedReporterId,
      reason: req.body.reason,
    });
    const exposure = await applyExposureRules(req.params.id);

    res.status(201).json({
      message: exposure.isExposed
        ? "Reporte registrado. La coartada quedó expuesta."
        : `Reporte registrado. Total de reportes: ${exposure.reportCount}.`,
      report,
      totalReports: exposure.reportCount,
      isExposed: exposure.isExposed,
      penaltyApplied: exposure.penaltyApplied,
    });
  })
);
