import { Router } from "express";
import { getMe, updateMe } from "../controllers/userController.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: Perfil del usuario en sesión
 */

/**
 * @swagger
 * /users/me:
 *   get:
 *     summary: Obtener el perfil del usuario en sesión
 *     tags: [Users]
 *     responses:
 *       200: { description: Datos del usuario }
 *       401: { description: No autenticado }
 */
router.get("/me", requireAuth, getMe);

/**
 * @swagger
 * /users/me:
 *   put:
 *     summary: Editar alias y/o especialidad
 *     tags: [Users]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               alias: { type: string }
 *               speciality:
 *                 type: string
 *                 enum: [CreativeExcuse, DetailOriented, Improviser, Conspirator]
 *     responses:
 *       200: { description: Usuario actualizado }
 *       409: { description: Alias ya en uso }
 */
router.put("/me", requireAuth, updateMe);

export default router;