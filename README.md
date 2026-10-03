# AlibiForge — Backend

API REST del Proyecto "AlibiForge" (Ingeniería Web), construida con Node.js, Express y MongoDB.

## Integrantes

- Matías Battistolo Cataño
- Samuel Acosta

## Tecnologías

Node.js (ES Modules) · Express 4 · MongoDB + Mongoose 8 · JWT (`jsonwebtoken`) · `bcryptjs` · Swagger (`swagger-jsdoc` + `swagger-ui-express`) · ESLint · `node:test` + `mongodb-memory-server`

## Instalación y uso

```bash
npm install
cp .env.example .env     # en Windows (cmd): copy .env.example .env
npm run seed             # datos de prueba (requiere MongoDB corriendo)
npm run dev              # servidor en http://localhost:4000
```

Otros scripts: `npm start`, `npm run lint`, `npm test` (no necesita MongoDB instalado: usa una en memoria).

Documentación interactiva: `http://localhost:4000/docs` (también `/api-docs`; JSON en `/api-docs.json`).

## Variables de entorno

| Variable | Descripción |
|---|---|
| `PORT` | Puerto del servidor (por defecto 4000) |
| `MONGODB_URI` | Cadena de conexión a MongoDB |
| `JWT_SECRET` | Secreto para firmar los tokens |
| `JWT_EXPIRES_IN` | Duración del token (por defecto 7d) |
| `CORS_ORIGIN` | URL del frontend (por defecto http://localhost:5173) |

## Endpoints

Las rutas marcadas con 🔒 requieren el header `Authorization: Bearer <token>`.

### Autenticación y perfil 

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/auth/register` | Crear cuenta (`alias`, `email`, `password`, `speciality`) |
| POST | `/auth/login` | Devuelve `{ token, user }` |
| POST | `/auth/logout` | Cerrar sesión |
| GET / PUT | `/users/me` 🔒 | Ver / editar el perfil |

### Coartadas 

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/alibis` 🔒 | Crear (`title`, `situation`, `story`, `details[]`, `witnesses[]` ids o alias, `situationId` opcional) |
| GET | `/alibis` | Listar (`owner=me`, `state`, `limit`) |
| GET | `/alibis/:id` | Detalle con `details[]` |
| PUT | `/alibis/:id` 🔒 | Editar mientras es Draft (cada edición guarda una versión) |
| GET | `/alibis/:id/versions` | Historial de versiones |
| POST | `/alibis/:id/details` 🔒 | Agregar detalle ancla |
| POST | `/alibis/:id/submit` 🔒 | Draft → Submitted (mínimo 3 detalles) |
| POST | `/alibis/:id/review` 🔒 | `{ "decision": "review" \| "approve" \| "reject" }`; cualquier usuario que no sea el dueño |

Máquina de estados: `Draft → Submitted → UnderReview → Approved | Rejected`. El primer voto pasa `Submitted → UnderReview`.

### Cadena de testigos 

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/alibis/:id/witnesses` | Listar testigos |
| POST | `/alibis/:id/witnesses` 🔒 | Sumarse a la cadena |
| DELETE | `/alibis/:id/witnesses/me` 🔒 | Desertar: -2 puntos al dueño y a los testigos restantes |

### Votos, reportes, situaciones y rankings

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/alibis/:id/votes` | Votos e índice de la coartada |
| POST | `/api/alibis/:id/votes` 🔒 | Votar (`credibility`, `creativity`, `consistency`, 1 a 5; un voto por usuario) |
| POST | `/api/alibis/:id/report` 🔒 | Reportar como falsa (3 reportes = expuesta) |
| GET | `/api/situations` | Situaciones con sus mejores coartadas |
| GET | `/api/situations/:id` | Situación con coartadas ordenadas por Credibility Index |
| POST | `/api/situations` 🔒 | Crear situación |
| POST / GET | `/api/situations/:id/requests` 🔒 / público | Pedir una coartada para la situación / listar peticiones |
| GET | `/api/rankings/:type` | `master-of-deceit`, `most-creative`, `most-consistent`, `most-wanted` |

## Reglas de negocio

- **Credibility Index** = `(promedio * 10) + (testigos * 2) + complejidad`, donde el promedio es el de `(credibilidad + creatividad + consistencia) / 3` de todos los votos. Se guarda en la coartada (`credibilityIndex`, `averageScore`, `voteCount`) y se recalcula en cada voto y en cada cambio de testigos o detalles.
- **Complejidad**: 3+ detalles = 5, 5+ = 10, 10+ = 20.
- **Exposición**: con 3 reportes la coartada pasa a `Rejected`, su índice queda en 0 y el creador pierde 10 puntos (una sola vez).
- **Bloqueo**: si el `credibilityScore` queda por debajo de 0, el usuario no puede crear coartadas durante 7 días; el bloqueo no se levanta antes de tiempo.
- **Votos y reportes**: salen del usuario del JWT; no se puede votar ni reportar la coartada propia ni coartadas en borrador, rechazadas o expuestas.

## Datos de prueba

`npm run seed` limpia y recrea: 3 guilds (The Excuse Makers, The Detail Weavers, The Improvisers), 12 usuarios (4 creativos, 4 detallistas, 4 improvisadores; contraseña `password123`), 15 coartadas (3 Draft, 4 Submitted, 5 Approved, 3 Rejected), 30 votos, 5 cadenas de 2 a 5 testigos y 5 situaciones.

## Estructura

```
src/
├── config/       # MongoDB y Swagger
├── models/       # Esquemas de Mongoose
├── controllers/  # Auth, usuarios, coartadas, testigos
├── routes/       # Rutas (auth, users, alibis y módulo /api)
├── middleware/   # Autenticación y errores
├── services/     # Fórmulas, credibilidad, exposición, rankings
├── utils/        # Constantes y helpers
├── app.js · server.js · seed.js
test/             # Pruebas de fórmulas y de flujo completo
```
