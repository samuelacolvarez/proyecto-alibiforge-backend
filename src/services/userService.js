import { User } from "../models/User.js";
import { BLOCK_DAYS } from "../utils/constants.js";

const DAY_MS = 24 * 60 * 60 * 1000;

// Suma (o resta) puntos de credibilidad a un usuario .
// - Si el score queda negativo y no hay un bloqueo vigente, bloquea 7 días.
// - Un bloqueo vigente NUNCA se levanta antes de tiempo, aunque el score suba.
export async function applyCredibilityChange(userId, delta) {
  const user = await User.findByIdAndUpdate(
    userId,
    { $inc: { credibilityScore: delta } },
    { new: true }
  );
  if (!user) return null;

  if (user.credibilityScore < 0 && !user.isBlocked()) {
    user.blockedUntil = new Date(Date.now() + BLOCK_DAYS * DAY_MS);
    await user.save();
  }

  return user;
}
