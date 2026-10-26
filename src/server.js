import "dotenv/config";
import http from "node:http";
import { Server } from "socket.io";
import { createApp } from "./app.js";
import { connectDB } from "./config/db.js";
import { registrarSockets } from "./socket/index.js";

const PORT = process.env.PORT || 4000;

const allowedOrigins = (
  process.env.CORS_ORIGIN || "http://localhost:5173,http://127.0.0.1:5173"
)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

async function start() {
  try {
    await connectDB(process.env.MONGODB_URI);
    const app = createApp();

    // Express y Socket.io comparten el mismo servidor HTTP y el mismo puerto.
    const server = http.createServer(app);
    const io = new Server(server, {
      cors: { origin: allowedOrigins.includes("*") ? true : allowedOrigins },
    });
    registrarSockets(io);

    server.listen(PORT, () => {
      console.log(`Servidor escuchando en http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("No se pudo iniciar el servidor:", error.message);
    process.exit(1);
  }
}

start();