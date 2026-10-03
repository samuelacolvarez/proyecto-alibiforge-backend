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

/**
 * @swagger
 * tags:
 *   name: Alibis
 *   description: CRUD de coartadas, detalles y cadena de testigos
 */

/**
 * @swagger
 * /alibis:
 *   get:
 *     summary: Listar coartadas
 *     tags: [Alibis]
 *     security: []
 *     parameters:
 *       - in: query
 *         name: owner
 *         schema: { type: string, example: me }
 *       - in: query
 *         name: state
 *         schema: { type: string, enum: [Draft, Submitted, UnderReview, Approved, Rejected] }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, example: 6 }
 *     responses:
 *       200: { description: Lista de coartadas }
 *   post:
 *     summary: Crear una coartada nueva (estado Draft)
 *     tags: [Alibis]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, situation, story]
 *             properties:
 *               title: { type: string }
 *               situation: { type: string }
 *               story: { type: string }
 *     responses:
 *       201: { description: Coartada creada }
 *       403: { description: Usuario bloqueado por credibilidad negativa }
 */
router.get("/", optionalAuth, listAlibis);
router.post("/", requireAuth, createAlibi);

/**
 * @swagger
 * /alibis/{id}:
 *   get:
 *     summary: Ver el detalle de una coartada
 *     tags: [Alibis]
 *     security: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Coartada con sus detalles }
 *       404: { description: No encontrada }
 *   put:
 *     summary: Editar una coartada (solo mientras es Draft)
 *     tags: [Alibis]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title: { type: string }
 *               situation: { type: string }
 *               story: { type: string }
 *               details:
 *                 type: array
 *                 items: { type: string }
 *     responses:
 *       200: { description: Coartada actualizada }
 *       403: { description: No sos el dueño }
 */
router.get("/:id", getAlibi);
router.put("/:id", requireAuth, updateAlibi);

/**
 * @swagger
 * /alibis/{id}/submit:
 *   post:
 *     summary: Enviar la coartada a revisión (Draft -> Submitted)
 *     tags: [Alibis]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Coartada enviada }
 *       400: { description: Faltan detalles mínimos o transición inválida }
 */
router.post("/:id/submit", requireAuth, submitAlibi);

/**
 * @swagger
 * /alibis/{id}/details:
 *   post:
 *     summary: Agregar un detalle ancla a una coartada en Draft
 *     tags: [Alibis]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [detail]
 *             properties:
 *               detail: { type: string, example: Tengo el ticket con la hora impresa }
 *     responses:
 *       201: { description: Detalle agregado, coartada actualizada }
 */
router.post("/:id/details", requireAuth, addDetail);

/**
 * @swagger
 * /alibis/{id}/witnesses:
 *   get:
 *     summary: Listar la cadena de testigos
 *     tags: [Alibis]
 *     security: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Lista de testigos }
 *   post:
 *     summary: Sumarse como testigo de una coartada
 *     tags: [Alibis]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       201: { description: Testigo agregado }
 *       409: { description: Ya sos testigo de esta coartada }
 */
router.get("/:id/witnesses", listWitnesses);
router.post("/:id/witnesses", requireAuth, joinChain);

/**
 * @swagger
 * /alibis/{id}/witnesses/me:
 *   delete:
 *     summary: Defectar de la cadena de testigos
 *     tags: [Alibis]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Testigo removido }
 *       404: { description: No sos testigo de esta coartada }
 */
router.delete("/:id/witnesses/me", requireAuth, defectFromChain);

export default router;