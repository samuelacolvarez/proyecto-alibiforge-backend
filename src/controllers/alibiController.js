import { Alibi } from "../models/Alibi.js";
import { AlibiDetail } from "../models/AlibiDetail.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ALIBI_STATES, ALIBI_STATE_VALUES, STORY_MAX_CHARS } from "../utils/constants.js";
import {
  assertCanSubmit,
  assertValidTransition,
  recalculateAlibiCounters,
} from "../services/alibiService.js";

// Arma la respuesta que espera el frontend: la coartada + sus detalles
async function serializeAlibi(alibi) {
  const details = await AlibiDetail.find({ alibi: alibi.id }).sort({ createdAt: 1 });
  return { ...alibi.toJSON(), details: details.map((d) => d.text) };
}

function assertOwner(alibi, user) {
  const ownerId = alibi.owner?.toString();
  if (ownerId !== user.id) {
    throw ApiError.forbidden("Esta coartada no es tuya.");
  }
}

// POST /alibis
export const createAlibi = asyncHandler(async (req, res) => {
  if (req.user.isBlocked()) {
    throw ApiError.forbidden(
      "Tu credibilidad es negativa: no puedes crear coartadas nuevas por ahora."
    );
  }

  const { title, situation, story } = req.body;
  if (!title || !situation || !story) {
    throw ApiError.badRequest("Título, situación e historia son obligatorios.");
  }
  if (story.length > STORY_MAX_CHARS) {
    throw ApiError.badRequest(`La historia no puede superar los ${STORY_MAX_CHARS} caracteres.`);
  }

  const alibi = await Alibi.create({
    title,
    situation,
    story,
    owner: req.user.id,
    state: ALIBI_STATES.DRAFT,
  });

  res.status(201).json(await serializeAlibi(alibi));
});

// GET /alibis?owner=me&state=Draft&limit=6
export const listAlibis = asyncHandler(async (req, res) => {
  const { owner, state, limit } = req.query;
  const filter = {};

  if (owner === "me") {
    if (!req.user) throw ApiError.unauthorized("Necesitas sesión para ver tus coartadas.");
    filter.owner = req.user.id;
  }

  if (state) {
    if (!ALIBI_STATE_VALUES.includes(state)) {
      throw ApiError.badRequest("Estado inválido.");
    }
    filter.state = state;
  }

  const query = Alibi.find(filter).sort({ createdAt: -1 });
  if (limit) query.limit(Math.min(Number(limit) || 10, 50));

  const alibis = await query;
  res.json(alibis.map((a) => a.toJSON()));
});

// GET /alibis/:id
export const getAlibi = asyncHandler(async (req, res) => {
  const alibi = await Alibi.findById(req.params.id);
  if (!alibi) throw ApiError.notFound("Coartada no encontrada.");
  res.json(await serializeAlibi(alibi));
});

// PUT /alibis/:id  (solo mientras es Draft)
export const updateAlibi = asyncHandler(async (req, res) => {
  const alibi = await Alibi.findById(req.params.id);
  if (!alibi) throw ApiError.notFound("Coartada no encontrada.");
  assertOwner(alibi, req.user);

  if (alibi.state !== ALIBI_STATES.DRAFT) {
    throw ApiError.badRequest("Solo se pueden editar coartadas en estado Borrador.");
  }

  const { title, situation, story, details } = req.body;
  if (title) alibi.title = title;
  if (situation) alibi.situation = situation;
  if (story) {
    if (story.length > STORY_MAX_CHARS) {
      throw ApiError.badRequest(`La historia no puede superar los ${STORY_MAX_CHARS} caracteres.`);
    }
    alibi.story = story;
  }
  await alibi.save();

  // Si el front manda el array completo de detalles, se reemplazan todos.
  if (Array.isArray(details)) {
    await AlibiDetail.deleteMany({ alibi: alibi.id });
    if (details.length > 0) {
      await AlibiDetail.insertMany(
        details.map((text) => ({ alibi: alibi.id, text }))
      );
    }
    await recalculateAlibiCounters(alibi.id);
  }

  const updated = await Alibi.findById(alibi.id);
  res.json(await serializeAlibi(updated));
});

// POST /alibis/:id/submit  (Draft -> Submitted)
export const submitAlibi = asyncHandler(async (req, res) => {
  const alibi = await Alibi.findById(req.params.id);
  if (!alibi) throw ApiError.notFound("Coartada no encontrada.");
  assertOwner(alibi, req.user);

  assertValidTransition(alibi.state, ALIBI_STATES.SUBMITTED);
  await assertCanSubmit(alibi.id);

  alibi.state = ALIBI_STATES.SUBMITTED;
  await alibi.save();

  res.json(await serializeAlibi(alibi));
});

// POST /alibis/:id/details
export const addDetail = asyncHandler(async (req, res) => {
  const alibi = await Alibi.findById(req.params.id);
  if (!alibi) throw ApiError.notFound("Coartada no encontrada.");
  assertOwner(alibi, req.user);

  if (alibi.state !== ALIBI_STATES.DRAFT) {
    throw ApiError.badRequest("Solo se pueden agregar detalles a un borrador.");
  }

  const text = req.body.detail ?? req.body.text;
  if (!text || !text.trim()) {
    throw ApiError.badRequest("El detalle no puede estar vacío.");
  }

  await AlibiDetail.create({ alibi: alibi.id, text: text.trim() });
  const updated = await recalculateAlibiCounters(alibi.id);

  res.status(201).json(await serializeAlibi(updated));
});
