import mongoose from "mongoose";
import { idOf } from "../utils/ids.js";

//un voto por usuario y coartada, con tres calificaciones de 1 a 5.
const ratingField = { type: Number, required: true, min: 1, max: 5 };

const voteSchema = new mongoose.Schema(
  {
    alibiId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Alibi",
      required: true,
      index: true,
    },
    voterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    credibility: ratingField,
    creativity: ratingField,
    consistency: ratingField,
  },
  { timestamps: true }
);

// Restricción de unicidad (user_id, alibi_id) del enunciado.
voteSchema.index({ alibiId: 1, voterId: 1 }, { unique: true });

voteSchema.set("toJSON", {
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret) => {
    ret.id = ret._id.toString();
    ret.alibiId = idOf(ret.alibiId);
    ret.voterId = idOf(ret.voterId);
    delete ret._id;
    return ret;
  },
});

export const Vote = mongoose.model("Vote", voteSchema);
