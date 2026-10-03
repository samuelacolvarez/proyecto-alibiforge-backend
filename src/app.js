import express from "express";
import cors from "cors";
import swaggerUi from "swagger-ui-express";

import { swaggerSpec } from "./config/swagger.js";

import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import alibiRoutes from "./routes/alibiRoutes.js";
import { notFoundHandler, errorHandler } from "./middleware/errorHandler.js";

import { rankingsRouter } from "./routes/rankings.js";
import { reportsRouter } from "./routes/reports.js";
import { situationsRouter } from "./routes/situations.js";
import { votesRouter } from "./routes/votes.js";

export function createApp() {
  const app = express();

  app.use(
    cors({
      origin: process.env.CORS_ORIGIN || "http://localhost:5173",
    })
  );
  app.use(express.json());

  app.get("/health", (_req, res) => res.json({ status: "ok" }));

  // Rutas de auth, perfil, coartadas
  app.use("/auth", authRoutes);
  app.use("/users", userRoutes);
  app.use("/alibis", alibiRoutes);

  // Rutas de situaciones, votos, reportes, rankings
  app.get("/api/health", (_req, res) =>
    res.json({ status: "ok", service: "alibiforge" })
  );
  app.use("/api", situationsRouter);
  app.use("/api", votesRouter);
  app.use("/api", reportsRouter);
  app.use("/api", rankingsRouter);

  // Documentación interactiva
  app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  app.get("/api-docs.json", (_req, res) => res.json(swaggerSpec));
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}