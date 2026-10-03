import mongoose from "mongoose";
import { idOf } from "../utils/ids.js";

// Foro de "situaciones de riesgo". 
const situationSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

situationSchema.index({ title: "text" });

situationSchema.set("toJSON", {
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret) => {
    ret.id = ret._id.toString();
    ret.createdBy = idOf(ret.createdBy) ?? null;
    delete ret._id;
    return ret;
  },
});

export const Situation = mongoose.model("Situation", situationSchema);
