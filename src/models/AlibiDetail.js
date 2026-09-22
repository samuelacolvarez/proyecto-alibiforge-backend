import mongoose from "mongoose";

// Definimos la estructura de un detalle de la coartada
const alibiDetailSchema = new mongoose.Schema(
  {
    alibi: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Alibi",
      required: true,
      index: true,
    },

    text: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Configuración para convertir el documento a JSON
alibiDetailSchema.set("toJSON", {
  virtuals: true,
  versionKey: false,

  transform: (doc, ret) => {
    // Cambiamos _id por id
    ret.id = ret._id.toString();

    // Eliminamos datos que no necesitamos mostrar
    delete ret._id;
    delete ret.alibi;

    return ret;
  },
});

export const AlibiDetail = mongoose.model("AlibiDetail", alibiDetailSchema);

