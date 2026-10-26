import jwt from "jsonwebtoken";
import { User } from "../models/User.js";
import { registrarChat } from "./chat.js";

const usuarios = new Map();

function listaUsuarios() {
  return Array.from(usuarios.values());
}

export function registrarSockets(io) {
  // Antes de conectar: identifica al usuario con el token que manda el frontend.
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error("Falta el token."));

      const payload = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(payload.sub);
      if (!user) return next(new Error("Usuario no encontrado."));

      socket.data.userId = user.id;
      socket.data.nombre = user.alias;
      next();
    } catch {
      next(new Error("Token inválido."));
    }
  });

  io.on("connection", (socket) => {
    const nombre = socket.data.nombre;
    usuarios.set(socket.id, { id: socket.id, nombre });

    io.emit("usuario:lista", listaUsuarios());
    socket.broadcast.emit("chat:mensaje", {
      id: `${socket.id}-${Date.now()}`,
      autor: "Sistema",
      texto: `${nombre} se ha unido al chat`,
      fecha: new Date().toISOString(),
      sistema: true,
    });

    // La página pide la lista al abrirse
    socket.on("usuario:listar", () => {
      socket.emit("usuario:lista", listaUsuarios());
    });

    registrarChat(io, socket);

    socket.on("disconnect", () => {
      usuarios.delete(socket.id);
      io.emit("usuario:lista", listaUsuarios());
    });
  });
}