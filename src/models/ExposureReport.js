import mongoose from "mongoose";

const exposureReportSchema = new mongoose.Schema(
  {
    alibiId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    reporterId: {
      type: String,
      required: true,
      trim: true,
    },
    reason: {
      type: String,
      trim: true,
      maxlength: 300,
      default: "",
    },
  },
  { timestamps: true }
);

exposureReportSchema.index(
  { alibiId: 1, reporterId: 1 },
  { unique: true }
);

export const ExposureReport = mongoose.model(
  "ExposureReport",
  exposureReportSchema
);
