import mongoose from "mongoose";

const voteSchema = new mongoose.Schema(
  {
    alibiId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    voterId: {
      type: String,
      required: true,
      trim: true,
    },
    credibility: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    creativity: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    consistency: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
  },
  { timestamps: true }
);

voteSchema.index({ alibiId: 1, voterId: 1 }, { unique: true });

export const Vote = mongoose.model("Vote", voteSchema);
