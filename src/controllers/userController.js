import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { SPECIALITIES } from "../utils/constants.js";
import { User } from "../models/User.js";

// GET /users/me
export const getMe = asyncHandler(async (req, res) => {
  res.json(req.user.toJSON());
});

// PUT /users/me
export const updateMe = asyncHandler(async (req, res) => {
  const { alias, speciality } = req.body;

  if (speciality && !SPECIALITIES.includes(speciality)) {
    throw ApiError.badRequest("Especialidad inválida.");
  }

  if (alias && alias !== req.user.alias) {
    const taken = await User.findOne({ alias });
    if (taken) throw ApiError.conflict("Ese alias ya está en uso.");
    req.user.alias = alias;
  }

  if (speciality) req.user.speciality = speciality;

  await req.user.save();
  res.json(req.user.toJSON());
});
