import mongoose from "mongoose";

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
    // Obtenemos el ID del usuario
    if (ret.user?._id) {
      ret.id = ret.user._id.toString();
    } else {
      ret.id = ret.user?.toString();
    }

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

