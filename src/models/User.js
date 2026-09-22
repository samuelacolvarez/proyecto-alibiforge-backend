import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { SPECIALITIES } from "../utils/constants.js";

const userSchema = new mongoose.Schema(
  {
    alias: { 
        type: String, 
        required: true, 
        unique: true, 
        trim: true
    },
    email: { 
        type: String, 
        required: true, 
        unique: true, 
        lowercase: true, 
        trim: true 
    },
    passwordHash: { 
        type: String, required: true },
    speciality: { 
        type: String, 
        enum: SPECIALITIES, 
        required: true
    },
    credibilityScore: { 
        type: Number, 
        default: 0 },
    // Si tenemos una credibilidad negativa, el usuario está bloqueado hasta la fecha indicada en `blockedUntil`.
    blockedUntil: { 
        type: Date, 
        default: null 
    },
    guild: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "Guild", 
        default: null },
  },
  { timestamps: true }
);

userSchema.set("toJSON", {
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.passwordHash;
    return ret;
  },
});

userSchema.methods.setPassword = async function setPassword(plainPassword) {
  this.passwordHash = await bcrypt.hash(plainPassword, 10);
};

userSchema.methods.checkPassword = function checkPassword(plainPassword) {
  return bcrypt.compare(plainPassword, this.passwordHash);
};

userSchema.methods.isBlocked = function isBlocked() {
  return Boolean(this.blockedUntil && this.blockedUntil > new Date());
};

export const User = mongoose.model("User", userSchema);
