import mongoose from "mongoose";
import { idOf } from "../utils/ids.js";

//un usuario pide que le ayuden con una coartada para una situación.
const alibiRequestSchema = new mongoose.Schema(
  {
    situationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Situation",
      required: true,
      index: true,
    },
    requester: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    message: {
      type: String,
      trim: true,
      maxlength: 300,
      default: "",
    },
  },
  { timestamps: true }
);

// Un usuario hace una sola petición por situación.
alibiRequestSchema.index({ situationId: 1, requester: 1 }, { unique: true });

alibiRequestSchema.set("toJSON", {
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret) => {
    ret.id = ret._id.toString();
    ret.situationId = idOf(ret.situationId);
    ret.requester = idOf(ret.requester);
    delete ret._id;
    return ret;
  },
});

export const AlibiRequest = mongoose.model("AlibiRequest", alibiRequestSchema);
