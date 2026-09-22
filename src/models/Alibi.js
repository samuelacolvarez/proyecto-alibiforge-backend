import mongoose from "mongoose";
import { ALIBI_STATE_VALUES, ALIBI_STATES, STORY_MAX_CHARS } from "../utils/constants.js";

const alibiSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    situation: { type: String, required: true, trim: true },
    story: { type: String, required: true, maxlength: STORY_MAX_CHARS },
    state: { type: String, enum: ALIBI_STATE_VALUES, default: ALIBI_STATES.DRAFT },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    // 'complexityScore' es un número que indica la complejidad del alibi, calculado a partir de la cantidad de detalles y testigos.
    complexityScore: { type: Number, default: 0 },
    witnessCount: { type: Number, default: 0 },
    detailCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

alibiSchema.set("toJSON", {
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret) => {
    ret.id = ret._id.toString();
   // Expone 'ownerId' en vez de 'owner' para que el JSON coincida con lo que espera el frontend.
    ret.ownerId = ret.owner?._id ? ret.owner._id.toString() : ret.owner?.toString();
    delete ret._id;
    delete ret.owner;
    return ret;
  },
});

export const Alibi = mongoose.model("Alibi", alibiSchema);
