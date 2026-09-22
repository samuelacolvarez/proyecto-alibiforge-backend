import mongoose from "mongoose";

// Definimos la estructura de un Guild
const guildSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    description: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

// Configuración para convertir el documento a JSON
guildSchema.set("toJSON", {
  virtuals: true,
  versionKey: false,

  transform: (doc, ret) => {
    // Cambiamos _id por id para que sea más fácil de usar
    ret.id = ret._id.toString();
    delete ret._id;

    return ret;
  },
});

export const Guild = mongoose.model("Guild", guildSchema);

