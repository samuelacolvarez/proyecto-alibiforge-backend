import mongoose from "mongoose";
import { ALIBI_STATE_VALUES, ALIBI_STATES, STORY_MAX_CHARS } from "../utils/constants.js";
import { idOf } from "../utils/ids.js";

//una coartada puede tener varias versiones.
const versionSchema = new mongoose.Schema(
  {
    number: { type: Number, required: true },
    title: { type: String, required: true },
    situation: { type: String, default: "" },
    story: { type: String, required: true },
    details: { type: [String], default: [] },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const alibiSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    situation: { type: String, required: true, trim: true },
    story: { type: String, required: true, maxlength: STORY_MAX_CHARS },
    state: { type: String, enum: ALIBI_STATE_VALUES, default: ALIBI_STATES.DRAFT },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    // Foro de situaciones al que pertenece la coartada
    situationId: { type: mongoose.Schema.Types.ObjectId, ref: "Situation", default: null, index: true },

    // Campos denormalizados: los calcula el backend, nunca el cliente.
    complexityScore: { type: Number, default: 0 },
    witnessCount: { type: Number, default: 0 },
    detailCount: { type: Number, default: 0 },

    // Votación y Credibility Index 
    credibilityIndex: { type: Number, default: 0, index: true },
    averageScore: { type: Number, default: 0 },
    voteCount: { type: Number, default: 0 },

    // Exposición
    exposed: { type: Boolean, default: false },
    reportCount: { type: Number, default: 0 },
    penaltyApplied: { type: Boolean, default: false },

    versions: { type: [versionSchema], default: [] },
  },
  { timestamps: true }
);

alibiSchema.set("toJSON", {
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret) => {
    ret.id = ret._id.toString();
    // Expone 'ownerId' en vez de 'owner' para que el JSON coincida con lo que espera el frontend.
    ret.ownerId = idOf(ret.owner);
    ret.situationId = idOf(ret.situationId) ?? null;
    // Las versiones se piden aparte (GET /alibis/:id/versions); aquí solo el conteo.
    ret.versionCount = ret.versions ? ret.versions.length : 0;
    delete ret._id;
    delete ret.owner;
    delete ret.versions;
    return ret;
  },
});

export const Alibi = mongoose.model("Alibi", alibiSchema);
