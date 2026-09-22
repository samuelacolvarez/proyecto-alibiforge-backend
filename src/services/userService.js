import { User } from "../models/User.js";
import { BLOCK_DAYS } from "../utils/constants.js";

// Si el score queda negativo, lo bloquea por 7 días para crear coartadas.
export async function applyCredibilityChange(userId, delta) {
  const user = await User.findById(userId);
  if (!user) return null;

  user.credibilityScore += delta;

  if (user.credibilityScore < 0) {
    const until = new Date();
    until.setDate(until.getDate() + BLOCK_DAYS);
    user.blockedUntil = until;
  } else {
    user.blockedUntil = null;
  }

  await user.save();
  return user;
}
