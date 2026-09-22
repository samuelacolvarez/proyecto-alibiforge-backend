import express from "express";
import cors from "cors";
import { rankingsRouter } from "./routes/rankings.js";
import { reportsRouter } from "./routes/reports.js";
import { situationsRouter } from "./routes/situations.js";
import { votesRouter } from "./routes/votes.js";
import { ApiError } from "./utils/ApiError.js";

export function createApp() {
  const app = express();

  app.use(
    cors({
      origin: process.env.CORS_ORIGIN || "*",
    })
  );
  app.use(express.json());

  app.get("/health", (_req, res) => res.json({ status: "ok" }));
  app.get("/api/health", (_req, res) =>
    res.json({ status: "ok", service: "alibiforge-matias" })
  );

  app.use("/api", situationsRouter);
  app.use("/api", votesRouter);
  app.use("/api", reportsRouter);
  app.use("/api", rankingsRouter);

  app.use((_req, _res, next) => {
    next(ApiError.notFound("Ruta no encontrada."));
  });

  app.use((error, _req, res, _next) => {
    if (error?.code === 11000) {
      return res.status(409).json({ message: "El registro ya existe." });
    }

    if (error?.name === "ValidationError") {
      return res.status(400).json({ message: error.message });
    }

    const status = error.status || 500;
    const message = status === 500 ? "Error interno del servidor." : error.message;

    if (status === 500) {
      console.error(error);
    }

    return res.status(status).json({ message });
  });

  return app;
}
