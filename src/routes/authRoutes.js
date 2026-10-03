import { Router } from "express";
import { register, login, logout } from "../controllers/authController.js";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Registro, login y logout
 */

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Crear una cuenta nueva
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [alias, email, password, speciality]
 *             properties:
 *               alias: { type: string, example: ElMaestroDeLasExcusas }
 *               email: { type: string, example: usuario@ejemplo.com }
 *               password: { type: string, example: password123 }
 *               speciality:
 *                 type: string
 *                 enum: [CreativeExcuse, DetailOriented, Improviser, Conspirator]
 *     responses:
 *       201: { description: Usuario creado }
 *       400: { description: Datos inválidos }
 *       409: { description: Alias o email ya existente }
 */
router.post("/register", register);

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Iniciar sesión
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [identifier, password]
 *             properties:
 *               identifier: { type: string, example: usuario@ejemplo.com }
 *               password: { type: string, example: password123 }
 *     responses:
 *       200: { description: Login exitoso, devuelve token y usuario }
 *       401: { description: Credenciales incorrectas }
 */
router.post("/login", login);

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Cerrar sesión
 *     tags: [Auth]
 *     security: []
 *     responses:
 *       200: { description: Sesión cerrada }
 */
router.post("/logout", logout);

export default router;