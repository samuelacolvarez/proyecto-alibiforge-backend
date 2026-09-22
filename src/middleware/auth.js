import jwt from "jsonwebtoken";
import { User } from "../models/User.js";
import { ApiError } from "../utils/ApiError.js";

// Lee el header Authorization: Bearer <token>, valida el JWT
// y deja el usuario en req.user para los controllers.
export async function requireAuth(req, _res, next) {
  try {
    const header = req.headers.authorization || "";
    const [scheme, token] = header.split(" ");

    if (scheme !== "Bearer" || !token) {
      throw ApiError.unauthorized("Falta el token de autenticación.");
    }

    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      throw ApiError.unauthorized("Token inválido o expirado.");
    }

    const user = await User.findById(payload.sub);
    if (!user) {
      throw ApiError.unauthorized("El usuario del token ya no existe.");
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}

// Nos sirve para endpoints públicos que muestran algo extra si hay sesión.
export async function optionalAuth(req, _res, next) {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");

  if (scheme === "Bearer" && token) {
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(payload.sub);
    } catch {
      req.user = null;
    }
  }
  next();
}
