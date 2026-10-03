import { Router } from "express";
import mongoose from "mongoose";
import { Alibi } from "../models/Alibi.js";
import { AlibiRequest } from "../models/AlibiRequest.js";
import { Situation } from "../models/Situation.js";
import { User } from "../models/User.js";
import { requireAuth } from "../middleware/auth.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ACTIVE_STATES } from "../utils/constants.js";

export const situationsRouter = Router();

const LIST_TOP_LIMIT = 5;

function escapeRegularExpression(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function assertSituationId(id) {
  if (!mongoose.isObjectIdOrHexString(id)) {
    throw ApiError.notFound("La situación no existe.");
  }
}

//Las coartadas de cada situación, ordenadas por Credibility Index.
async function topAlibisBySituation(situationIds) {
  const alibis = await Alibi.find({
    situationId: { $in: situationIds },
    state: { $in: ACTIVE_STATES },
    exposed: false,
  }).sort({ credibilityIndex: -1, createdAt: 1 });

  const ownerIds = [...new Set(alibis.map((alibi) => String(alibi.owner)))];
  const owners = await User.find({ _id: { $in: ownerIds } }).select("alias").lean();
  const aliasById = new Map(owners.map((owner) => [String(owner._id), owner.alias]));

  const grouped = new Map();
  for (const alibi of alibis) {
    const json = alibi.toJSON();
    const entry = {
      ...json,
      externalId: json.id,
      creatorId: json.ownerId,
      creatorAlias: aliasById.get(json.ownerId) ?? "Desconocido",
    };
    const key = String(alibi.situationId);
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(entry);
  }
  return grouped;
}

function serializeSituation(situation, alibis) {
  const json = situation.toJSON();
  return { ...json, _id: json.id, alibiCount: alibis.length, alibis };
}

situationsRouter.get(
  "/situations",
  asyncHandler(async (req, res) => {
    const search = String(req.query.search || "").trim();
    const filter = search
      ? { title: { $regex: escapeRegularExpression(search), $options: "i" } }
      : {};
    const situations = await Situation.find(filter).sort({ createdAt: -1 });
    const grouped = await topAlibisBySituation(situations.map((s) => s._id));

    res.json(
      situations.map((situation) => {
        const all = grouped.get(String(situation._id)) ?? [];
        const serialized = serializeSituation(situation, all);
        return { ...serialized, alibis: all.slice(0, LIST_TOP_LIMIT) };
      })
    );
  })
);

situationsRouter.get(
  "/situations/:id",
  asyncHandler(async (req, res) => {
    assertSituationId(req.params.id);

    const situation = await Situation.findById(req.params.id);

    if (!situation) {
      throw ApiError.notFound("La situación no existe.");
    }

    const grouped = await topAlibisBySituation([situation._id]);
    res.json(serializeSituation(situation, grouped.get(String(situation._id)) ?? []));
  })
);

//Crear situaciones requiere sesión.
situationsRouter.post(
  "/situations",
  requireAuth,
  asyncHandler(async (req, res) => {
    const title = String(req.body.title || "").trim();
    const description = String(req.body.description || "").trim();

    if (!title || !description) {
      throw ApiError.badRequest("El título y la descripción son obligatorios.");
    }

    const situation = await Situation.create({
      title,
      description,
      createdBy: req.user._id,
    });

    res.status(201).json({
      message: "Situación creada correctamente.",
      situation: serializeSituation(situation, []),
    });
  })
);

// Pedir una coartada para una situación.
situationsRouter.post(
  "/situations/:id/requests",
  requireAuth,
  asyncHandler(async (req, res) => {
    assertSituationId(req.params.id);

    const situation = await Situation.findById(req.params.id);
    if (!situation) {
      throw ApiError.notFound("La situación no existe.");
    }

    const already = await AlibiRequest.exists({
      situationId: situation._id,
      requester: req.user._id,
    });
    if (already) {
      throw ApiError.conflict("Ya pediste una coartada para esta situación.");
    }

    const request = await AlibiRequest.create({
      situationId: situation._id,
      requester: req.user._id,
      message: req.body.message,
    });

    res.status(201).json({
      message: "Petición registrada. La comunidad podrá responder con coartadas.",
      request: request.toJSON(),
    });
  })
);

situationsRouter.get(
  "/situations/:id/requests",
  asyncHandler(async (req, res) => {
    assertSituationId(req.params.id);

    const requests = await AlibiRequest.find({ situationId: req.params.id }).sort({
      createdAt: -1,
    });

    res.json(requests.map((request) => request.toJSON()));
  })
);
