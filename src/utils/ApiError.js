export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }

  static badRequest(message) {
    return new ApiError(400, message);
  }
  static unauthorized(message = "No autenticado.") {
    return new ApiError(401, message);
  }
  static forbidden(message = "No tienes permiso para hacer esto.") {
    return new ApiError(403, message);
  }
  static notFound(message = "Recurso no encontrado.") {
    return new ApiError(404, message);
  }
  static conflict(message) {
    return new ApiError(409, message);
  }
}
