import mongoose from "mongoose";

const communityAlibiSchema = new mongoose.Schema(
  {
    externalId: {
      type: String,
      required: true,
      trim: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    story: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    creatorId: {
      type: String,
      required: true,
      trim: true,
    },
    creatorAlias: {
      type: String,
      required: true,
      trim: true,
    },
    witnessCount: {
      type: Number,
      min: 0,
      default: 0,
    },
    credibilityIndex: {
      type: Number,
      min: 0,
      max: 5,
      default: 0,
    },
    exposed: {
      type: Boolean,
      default: false,
    },
    reportCount: {
      type: Number,
      min: 0,
      default: 0,
    },
    penaltyPoints: {
      type: Number,
      default: 0,
    },
    penaltyApplied: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false }
);

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
    alibis: {
      type: [communityAlibiSchema],
      default: [],
    },
  },
  { timestamps: true }
);

situationSchema.index({ title: "text" });
situationSchema.index({ "alibis.externalId": 1 }, { unique: true, sparse: true });

export const Situation = mongoose.model("Situation", situationSchema);
