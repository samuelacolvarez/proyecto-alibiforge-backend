import { ApiError } from "../utils/ApiError.js";

export function notFoundHandler(_req, res) {
  res.status(404).json({ message: "Ruta no encontrada." });
}

// Traduce cualquier error a un JSON con la misma forma:
export function errorHandler(error, _req, res, _next) {
  if (error instanceof ApiError) {
    return res.status(error.status).json({ message: error.message });
  }

  // Errores de validación de Mongoose
  if (error.name === "ValidationError") {
    const message = Object.values(error.errors)
      .map((e) => e.message)
      .join(" ");
    return res.status(400).json({ message });
  }

  //alias o email repetido, testigo duplicado
  if (error.code === 11000) {
    const field = Object.keys(error.keyPattern || {}).join(", ");
    return res.status(409).json({ message: `Ya existe un registro con ese ${field}.` });
  }

  // ID de Mongo mal formado
  if (error.name === "CastError") {
    return res.status(400).json({ message: "Identificador inválido." });
  }

  console.error(error);
  return res.status(500).json({ message: "Error interno del servidor." });
}
