import { Alibi } from "../models/Alibi.js";
import { AlibiDetail } from "../models/AlibiDetail.js";
import { Situation } from "../models/Situation.js";
import { Witness } from "../models/Witness.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  ALIBI_STATES,
  ALIBI_STATE_VALUES,
  REVIEW_DECISIONS,
  STORY_MAX_CHARS,
} from "../utils/constants.js";
import {
  addVersionSnapshot,
  assertCanSubmit,
  assertValidTransition,
  normalizeDetails,
  recalculateAlibiCounters,
  resolveWitnessUsers,
} from "../services/alibiService.js";

const HEX_ID = /^[0-9a-fA-F]{24}$/;

// Arma la respuesta que espera el frontend: la coartada + sus detalles
// como array de strings (así lo consume DetailList).
async function serializeAlibi(alibi) {
  const details = await AlibiDetail.find({ alibi: alibi.id }).sort({ createdAt: 1, _id: 1 });
  return { ...alibi.toJSON(), details: details.map((d) => d.text) };
}

function assertOwner(alibi, user) {
  const ownerId = alibi.owner?.toString();
  if (ownerId !== user.id) {
    throw ApiError.forbidden("Esta coartada no es tuya.");
  }
}

// Si el cliente manda situationId, la situación tiene que existir.
async function resolveSituation(situationId) {
  if (situationId === undefined || situationId === null || situationId === "") return null;
  if (!HEX_ID.test(String(situationId))) {
    throw ApiError.badRequest("situationId inválido.");
  }
  const situation = await Situation.findById(situationId);
  if (!situation) throw ApiError.notFound("La situación indicada no existe.");
  return situation;
}

// POST /alibis
// Body: { title, situation, story, details?: string[], witnesses?: (id|alias)[], situationId? }
export const createAlibi = asyncHandler(async (req, res) => {
  if (req.user.isBlocked()) {
    throw ApiError.forbidden(
      "Tu credibilidad es negativa: no puedes crear coartadas nuevas por ahora."
    );
  }

  const { title, story } = req.body;
  const situationDoc = await resolveSituation(req.body.situationId);
  const situationText =
    (typeof req.body.situation === "string" && req.body.situation.trim()) ||
    situationDoc?.title;

  if (!title || !situationText || !story) {
    throw ApiError.badRequest("Título, situación e historia son obligatorios.");
  }
  if (story.length > STORY_MAX_CHARS) {
    throw ApiError.badRequest(`La historia no puede superar los ${STORY_MAX_CHARS} caracteres.`);
  }

  // Se valida todo antes de escribir, para no dejar coartadas a medias.
  const details = normalizeDetails(req.body.details);
  const witnessUsers = await resolveWitnessUsers(req.body.witnesses, req.user.id);

  const alibi = await Alibi.create({
    title,
    situation: situationText,
    story,
    owner: req.user.id,
    situationId: situationDoc?._id ?? null,
    state: ALIBI_STATES.DRAFT,
  });

  if (details.length > 0) {
    await AlibiDetail.insertMany(details.map((text) => ({ alibi: alibi._id, text })));
  }
  if (witnessUsers.length > 0) {
    await Witness.insertMany(witnessUsers.map((user) => ({ alibi: alibi._id, user: user._id })));
  }

  await recalculateAlibiCounters(alibi.id);
  await addVersionSnapshot(alibi.id);

  const created = await Alibi.findById(alibi.id);
  res.status(201).json(await serializeAlibi(created));
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

// GET /alibis/:id/versions  (req. 3: múltiples versiones)
export const listVersions = asyncHandler(async (req, res) => {
  const alibi = await Alibi.findById(req.params.id);
  if (!alibi) throw ApiError.notFound("Coartada no encontrada.");

  res.json(
    alibi.versions.map((v) => ({
      number: v.number,
      title: v.title,
      situation: v.situation,
      story: v.story,
      details: v.details,
      createdAt: v.createdAt,
    }))
  );
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
  const cleanDetails = Array.isArray(details) ? normalizeDetails(details) : undefined;

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
  if (cleanDetails) {
    await AlibiDetail.deleteMany({ alibi: alibi.id });
    if (cleanDetails.length > 0) {
      await AlibiDetail.insertMany(
        cleanDetails.map((text) => ({ alibi: alibi.id, text }))
      );
    }
  }
  await recalculateAlibiCounters(alibi.id);

  // Cada edición del borrador deja una versión nueva.
  if (title || situation || story || cleanDetails) {
    await addVersionSnapshot(alibi.id);
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

// POST /alibis/:id/review   Body: { decision: "review" | "approve" | "reject" }
// Cualquier usuario autenticado que NO sea el dueño. La state machine valida el paso.
export const reviewAlibi = asyncHandler(async (req, res) => {
  const alibi = await Alibi.findById(req.params.id);
  if (!alibi) throw ApiError.notFound("Coartada no encontrada.");

  if (alibi.owner.toString() === req.user.id) {
    throw ApiError.forbidden("No puedes revisar tu propia coartada.");
  }

  const target = REVIEW_DECISIONS[req.body.decision];
  if (!target) {
    throw ApiError.badRequest('decision debe ser "review", "approve" o "reject".');
  }

  assertValidTransition(alibi.state, target);
  alibi.state = target;
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
