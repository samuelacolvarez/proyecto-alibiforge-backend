import { ApiError } from "./ApiError.js";

export function resolveActorId(req) {
  if (req.user) return String(req.user._id);

  const body = req.body || {};
  const raw = body.voterId ?? body.reporterId ?? body.userId ?? body.visitorId;
  const id = String(raw ?? "").trim();

  if (!id) {
    throw ApiError.badRequest(
      "Inicia sesión o envía voterId, reporterId, userId o visitorId."
    );
  }
  if (id.length > 100) {
    throw ApiError.badRequest("El identificador es demasiado largo.");
  }
  return id;
}