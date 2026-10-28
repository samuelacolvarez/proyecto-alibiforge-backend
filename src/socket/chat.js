// Eventos del chat: mensajes y aviso de "escribiendo".
export function registrarChat(io, socket) {
  socket.on("chat:mensaje", (texto) => {
    const textoLimpio = String(texto || "").trim();
    if (!textoLimpio || textoLimpio.length > 300) return;

    // io.emit envía a TODOS los clientes conectados
    io.emit("chat:mensaje", {
      id: `${socket.id}-${Date.now()}`,
      autor: socket.data.nombre || "Anónimo",
      autorId: socket.id,
      texto: textoLimpio,
      fecha: new Date().toISOString(),
      sistema: false,
    });
  });

  socket.on("chat:escribiendo", (escribiendo) => {
    // broadcast envía a todos MENOS a quien escribe
    socket.broadcast.emit("chat:escribiendo", {
      id: socket.id,
      nombre: socket.data.nombre || "Anónimo",
      escribiendo: Boolean(escribiendo),
    });
  });
}