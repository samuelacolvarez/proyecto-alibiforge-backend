# AlibiForge — Backend (Entrega Final) 

API REST del Proyecto "AlibiForge" (Ingeniería Web), construida con Node.js, Express y MongoDB, con roles de usuario y chat en tiempo real mediante WebSockets.

## URLs públicas

| Servicio | URL |
|---|---|
| Backend (Render) | https://proyecto-alibiforge-backend.onrender.com |
| Documentación Swagger | https://proyecto-alibiforge-backend.onrender.com/docs |
| Frontend (Vercel) | https://proyecto-alibiforge-frontend.vercel.app |
| Repositorio del frontend | https://github.com/samuelacolvarez/proyecto-alibiforge-frontend |

## Credenciales de prueba

| Rol | Email | Contraseña |
|---|---|---|
| Usuario estándar | `mente@eia.edu.co` | `password123` |
| Administrador | `admin@alibiforge.com` | `Admin12345` |

Los otros 11 usuarios del seed (por ejemplo `fantasma@eia.edu.co`) también usan `password123`. Cualquier registro nuevo desde la aplicación queda con rol `user`; el rol `admin` solo se asigna desde la base de datos o el seed.

## Integrantes

- Matías Battistolo Castaño
- Samuel Acosta Álvarez

## Tecnologías

Node.js (ES Modules) · Express 4 · MongoDB + Mongoose 8 · JWT (`jsonwebtoken`) · `bcryptjs` · Socket.io · Swagger (`swagger-jsdoc` + `swagger-ui-express`) · ESLint · `node:test` + `mongodb-memory-server`

## Instalación y uso local

```bash
npm install
cp .env.example .env     # en Windows (cmd): copy .env.example .env
npm run seed             # datos de prueba (borra y recrea la base de MONGODB_URI)
npm run dev              # servidor en http://localhost:4000
```

Otros scripts: `npm start`, `npm run lint`, `npm test` (usa una MongoDB en memoria, no necesita instalar nada).

Documentación interactiva: `http://localhost:4000/docs` (también `/api-docs`; JSON en `/api-docs.json`).

## Variables de entorno

| Variable | Descripción | Ejemplo |
|---|---|---|
| `PORT` | Puerto del servidor | `4000` |
| `MONGODB_URI` | Cadena de conexión a MongoDB Atlas | `mongodb+srv://USUARIO:CLAVE@cluster0.xxxxx.mongodb.net/alibiforge` |
| `JWT_SECRET` | Secreto para firmar los tokens (cadena larga y aleatoria) | `cambia-esto-por-un-secreto-largo` |
| `JWT_EXPIRES_IN` | Duración del token | `7d` |
| `CORS_ORIGIN` | URL(s) del frontend, separadas por coma | `http://localhost:5173` (local) o `https://proyecto-alibiforge-frontend.vercel.app` (producción) |

En Render deben estar configuradas `MONGODB_URI`, `JWT_SECRET` y `CORS_ORIGIN` (con la URL de Vercel). Para cargar los datos de prueba en producción, ejecuta `npm run seed` en local con `MONGODB_URI` apuntando a Atlas.

## Roles y permisos

| Acción | Usuario | Administrador |
|---|---|---|
| Registrarse, iniciar sesión, editar su perfil | ✅ | ✅ |
| Crear, editar y enviar sus coartadas | ✅ | ✅ |
| Eliminar una coartada | Solo sus borradores | Cualquiera |
| Votar, reportar, ser testigo | ✅ | ✅ |
| Crear situaciones | ✅ | ✅ |
| Eliminar situaciones | ❌ | ✅ |
| Listar todos los usuarios | ❌ | ✅ |

El rol viaja en el usuario (`role: "user" \| "admin"`) y se valida en el servidor con el middleware `requireRole`. Sin permisos la API responde `403`.

## Endpoints

Las rutas marcadas con 🔒 requieren `Authorization: Bearer <token>`. Todas responden con y sin el prefijo `/api`.

### Autenticación y perfil

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/auth/register` | Crear cuenta (`alias`, `email`, `password`, `speciality`) |
| POST | `/auth/login` | Devuelve `{ token, user }` |
| POST | `/auth/logout` | Cerrar sesión |
| GET / PUT | `/users/me` 🔒 | Ver / editar el perfil |
| GET | `/users` 🔒 admin | Listar todos los usuarios |

### Coartadas

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/alibis` 🔒 | Crear (`title`, `situation`, `story`, `details[]`, `witnesses[]`, `situationId` opcional) |
| GET | `/alibis` | Listar (`owner=me`, `state`, `limit`) |
| GET | `/alibis/:id` | Detalle con `details[]` |
| PUT | `/alibis/:id` 🔒 | Editar mientras es Draft (guarda una versión) |
| DELETE | `/alibis/:id` 🔒 | Dueño: solo borradores. Administrador: cualquiera |
| GET | `/alibis/:id/versions` | Historial de versiones |
| POST | `/alibis/:id/details` 🔒 | Agregar detalle ancla |
| POST | `/alibis/:id/submit` 🔒 | Draft → Submitted (mínimo 3 detalles) |
| POST | `/alibis/:id/review` 🔒 | `{ "decision": "review" \| "approve" \| "reject" }`; no el dueño ni sus testigos |

### Cadena de testigos

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/alibis/:id/witnesses` | Listar testigos |
| POST | `/alibis/:id/witnesses` 🔒 | Sumarse a la cadena |
| DELETE | `/alibis/:id/witnesses/me` 🔒 | Desertar: -2 puntos al dueño y a los testigos restantes; no puede volver a unirse |

### Votos, reportes, situaciones y rankings

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/alibis/:id/votes` | Votos e índice de la coartada |
| POST | `/api/alibis/:id/votes` 🔒 | Votar (`credibility`, `creativity`, `consistency`, 1 a 5; un voto por usuario) |
| POST | `/api/alibis/:id/report` 🔒 | Reportar como falsa (3 reportes = expuesta) |
| GET | `/api/situations` | Situaciones con sus mejores coartadas |
| GET | `/api/situations/:id` | Situación con coartadas por Credibility Index |
| POST | `/api/situations` 🔒 | Crear situación |
| DELETE | `/api/situations/:id` 🔒 admin | Eliminar situación |
| POST / GET | `/api/situations/:id/requests` | Pedir una coartada (🔒) / listar peticiones |
| GET | `/api/rankings/:type` | `master-of-deceit`, `most-creative`, `most-consistent`, `most-wanted` |

## Chat en tiempo real (WebSocket)

Socket.io comparte el servidor HTTP y el puerto de la API. El token JWT va en el handshake; sin token válido, la conexión se rechaza.

```js
import { io } from "socket.io-client";
const socket = io("http://localhost:4000", { auth: { token } });
```

| Evento | Dirección | Descripción |
|---|---|---|
| `chat:mensaje` | cliente → servidor | Texto (máximo 300 caracteres) |
| `chat:mensaje` | servidor → todos | `{ id, autor, autorId, texto, fecha, sistema }` |
| `chat:escribiendo` | cliente → servidor | `true` / `false` |
| `chat:escribiendo` | servidor → los demás | `{ id, nombre, escribiendo }` |
| `usuario:listar` | cliente → servidor | Pide la lista de conectados |
| `usuario:lista` | servidor → todos | Lista de usuarios conectados |

## Reglas de negocio

- **Credibility Index** = `(promedio * 10) + (testigos * 2) + complejidad`; el promedio es el de `(credibilidad + creatividad + consistencia) / 3` de todos los votos. Se recalcula en cada voto y en cada cambio de testigos o detalles.
- **Complejidad**: 3+ detalles = 5, 5+ = 10, 10+ = 20.
- **Exposición**: con 3 reportes la coartada pasa a `Rejected`, su índice queda en 0 y el creador pierde 10 puntos (una sola vez).
- **Bloqueo**: con `credibilityScore` menor a 0, el usuario no puede crear coartadas durante 7 días.
- **Votos y reportes**: salen del usuario del JWT; no se puede votar ni reportar la coartada propia ni coartadas en borrador, rechazadas o expuestas.

## Datos de prueba

`npm run seed` **borra y recrea** la base: 3 guilds, 12 usuarios (contraseña `password123`) más el administrador, 15 coartadas (3 Draft, 4 Submitted, 5 Approved, 3 Rejected), 30 votos, 5 cadenas de 2 a 5 testigos y 5 situaciones.

## Estructura

```
src/
├── config/       # MongoDB y Swagger
├── models/       # Esquemas de Mongoose
├── controllers/  # Auth, usuarios, coartadas, testigos
├── routes/       # Rutas (auth, users, alibis y módulo /api)
├── middleware/   # Autenticación, roles y errores
├── services/     # Fórmulas, credibilidad, exposición, rankings
├── socket/       # Chat en tiempo real (Socket.io)
├── utils/        # Constantes y helpers
├── app.js · server.js · seed.js
test/             # Pruebas de fórmulas y de flujo completo
```
