import mongoose from "mongoose";
import { idOf } from "../utils/ids.js";

// Definimos la estructura de un Witness
const witnessSchema = new mongoose.Schema(
  {
    alibi: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Alibi",
      required: true,
    },

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Un usuario no puede sumarse dos veces a la misma cadena
witnessSchema.index(
  { alibi: 1, user: 1 },
  { unique: true }
);

// Configuración para convertir el documento a JSON
witnessSchema.set("toJSON", {
  virtuals: true,
  versionKey: false,

  transform: (doc, ret) => {
    // Con populate("user", "alias"), Mongoose ya serializó el usuario con su
    // propio toJSON (trae `id`, no `_id`). idOf() maneja ambos casos.
    ret.id = idOf(ret.user);

    // Guardamos el ID también como userId
    ret.userId = ret.id;

    // Obtenemos el alias del usuario
    ret.alias = ret.user?.alias;

    // Eliminamos datos que no necesitamos mostrar
    delete ret._id;
    delete ret.user;
    delete ret.alibi;

    return ret;
  },
});

export const Witness = mongoose.model("Witness", witnessSchema);
