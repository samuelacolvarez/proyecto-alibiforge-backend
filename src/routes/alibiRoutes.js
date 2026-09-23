import { Router } from "express";
import {
  createAlibi,
  listAlibis,
  getAlibi,
  updateAlibi,
  submitAlibi,
  addDetail,
} from "../controllers/alibiController.js";
import {
  listWitnesses,
  joinChain,
  defectFromChain,
} from "../controllers/witnessController.js";
import { requireAuth, optionalAuth } from "../middleware/auth.js";

const router = Router();

router.get("/", optionalAuth, listAlibis);
router.get("/:id", getAlibi);
router.get("/:id/witnesses", listWitnesses);

// Requieren sesión
router.post("/", requireAuth, createAlibi);
router.put("/:id", requireAuth, updateAlibi);
router.post("/:id/submit", requireAuth, submitAlibi);
router.post("/:id/details", requireAuth, addDetail);
router.post("/:id/witnesses", requireAuth, joinChain);
router.delete("/:id/witnesses/me", requireAuth, defectFromChain);

export default router;
