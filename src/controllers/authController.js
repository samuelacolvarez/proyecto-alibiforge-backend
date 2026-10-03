import jwt from "jsonwebtoken";
import { User } from "../models/User.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { SPECIALITIES } from "../utils/constants.js";

function signToken(user) {
  return jwt.sign({ sub: user.id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
}

// POST /auth/register
export const register = asyncHandler(async (req, res) => {
  const { alias, email, password, speciality } = req.body;

  if (!alias || !email || !password || !speciality) {
    throw ApiError.badRequest("Alias, email, contraseña y especialidad son obligatorios.");
  }
  if (password.length < 6) {
    throw ApiError.badRequest("La contraseña debe tener al menos 6 caracteres.");
  }
  if (!SPECIALITIES.includes(speciality)) {
    throw ApiError.badRequest("Especialidad inválida.");
  }

  const existing = await User.findOne({
    $or: [{ email: email.toLowerCase() }, { alias }],
  });
  if (existing) {
    throw ApiError.conflict("Ya existe un usuario con ese alias o email.");
  }

  const user = new User({ alias, email, speciality });
  await user.setPassword(password);
  await user.save();

  res.status(201).json(user.toJSON());
});

// POST /auth/login
export const login = asyncHandler(async (req, res) => {
  const { identifier, password } = req.body;

  if (!identifier || !password) {
    throw ApiError.badRequest("Email/alias y contraseña son obligatorios.");
  }

  const user = await User.findOne({
    $or: [{ email: identifier.toLowerCase() }, { alias: identifier }],
  });

  if (!user || !(await user.checkPassword(password))) {
    throw ApiError.unauthorized("Email/alias o contraseña incorrectos.");
  }

  res.json({ token: signToken(user), user: user.toJSON() });
});


export const logout = asyncHandler(async (_req, res) => {
  res.json({ message: "Sesión cerrada." });
});
