import swaggerJsdoc from "swagger-jsdoc";

// Un solo documento OpenAPI para todo el backend:
//  - Auth, usuarios y coartadas se documentan con comentarios @swagger en src/routes/*.js
//  - Situaciones, votos, reportes y rankings (prefijo /api) se documentan abajo.
const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "AlibiForge API",
      version: "1.0.0",
      description:
        "Autenticación, perfil, coartadas, cadena de testigos, votos, reportes, situaciones y rankings.",
    },
    servers: [
      {
        url: `http://localhost:${process.env.PORT || 4000}`,
        description: "Servidor local",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
      schemas: {
        Rating: { type: "integer", minimum: 1, maximum: 5, example: 4 },
        VoteInput: {
          type: "object",
          required: ["credibility", "creativity", "consistency"],
          properties: {
            credibility: { $ref: "#/components/schemas/Rating" },
            creativity: { $ref: "#/components/schemas/Rating" },
            consistency: { $ref: "#/components/schemas/Rating" },
          },
        },
        Vote: {
          type: "object",
          properties: {
            id: { type: "string" },
            alibiId: { type: "string" },
            voterId: { type: "string" },
            credibility: { $ref: "#/components/schemas/Rating" },
            creativity: { $ref: "#/components/schemas/Rating" },
            consistency: { $ref: "#/components/schemas/Rating" },
          },
        },
        SituationAlibi: {
          type: "object",
          description: "Coartada de una situación, con su Credibility Index.",
          properties: {
            id: { type: "string" },
            title: { type: "string" },
            state: { type: "string", enum: ["Submitted", "UnderReview", "Approved"] },
            credibilityIndex: { type: "number", example: 54 },
            witnessCount: { type: "integer" },
            complexityScore: { type: "integer" },
            creatorId: { type: "string" },
            creatorAlias: { type: "string" },
          },
        },
        Situation: {
          type: "object",
          properties: {
            id: { type: "string" },
            title: { type: "string" },
            description: { type: "string" },
            createdBy: { type: "string", nullable: true },
            alibiCount: { type: "integer" },
            alibis: {
              type: "array",
              description: "Ordenadas por credibilityIndex (de mayor a menor).",
              items: { $ref: "#/components/schemas/SituationAlibi" },
            },
          },
        },
        RankingRow: {
          type: "object",
          properties: {
            id: { type: "string", description: "Id del usuario" },
            alias: { type: "string" },
            score: { type: "number" },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ["./src/routes/*.js"],
};

const idParam = {
  in: "path",
  name: "id",
  required: true,
  schema: { type: "string" },
};

const swaggerSpec = swaggerJsdoc(options);

swaggerSpec.tags = [
  ...(swaggerSpec.tags || []),
  { name: "Situaciones", description: "Foro de situaciones y peticiones de coartadas" },
  { name: "Votos", description: "Votación de coartadas (requiere sesión)" },
  { name: "Reportes", description: "Exposición de coartadas falsas (requiere sesión)" },
  { name: "Rankings", description: "Maestros del engaño" },
];

swaggerSpec.paths = {
  ...swaggerSpec.paths,
  "/api/situations": {
    get: {
      tags: ["Situaciones"],
      summary: "Listar situaciones con sus mejores coartadas",
      security: [],
      parameters: [{ in: "query", name: "search", schema: { type: "string" } }],
      responses: {
        200: {
          description: "Situaciones; cada una trae `alibis` ordenadas por Credibility Index",
          content: {
            "application/json": {
              schema: { type: "array", items: { $ref: "#/components/schemas/Situation" } },
            },
          },
        },
      },
    },
    post: {
      tags: ["Situaciones"],
      summary: "Crear una situación (requiere sesión)",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["title", "description"],
              properties: { title: { type: "string" }, description: { type: "string" } },
            },
          },
        },
      },
      responses: {
        201: { description: "Situación creada" },
        401: { description: "Falta el token" },
      },
    },
  },
  "/api/situations/{id}": {
    get: {
      tags: ["Situaciones"],
      summary: "Detalle de una situación con todas sus coartadas ordenadas por índice",
      security: [],
      parameters: [idParam],
      responses: {
        200: {
          description: "Situación",
          content: { "application/json": { schema: { $ref: "#/components/schemas/Situation" } } },
        },
        404: { description: "No existe" },
      },
    },
  },
  "/api/situations/{id}/requests": {
    get: {
      tags: ["Situaciones"],
      summary: "Peticiones de coartada hechas para la situación",
      security: [],
      parameters: [idParam],
      responses: { 200: { description: "Lista de peticiones" } },
    },
    post: {
      tags: ["Situaciones"],
      summary: "Pedir una coartada para esta situación (requiere sesión)",
      parameters: [idParam],
      requestBody: {
        content: {
          "application/json": {
            schema: { type: "object", properties: { message: { type: "string", maxLength: 300 } } },
          },
        },
      },
      responses: {
        201: { description: "Petición registrada" },
        409: { description: "Ya pediste una coartada para esta situación" },
      },
    },
  },
  "/api/alibis/{id}/votes": {
    get: {
      tags: ["Votos"],
      summary: "Votos de una coartada y su Credibility Index",
      security: [],
      parameters: [idParam],
      responses: { 200: { description: "{ votes, credibilityIndex, averageScore, voteCount }" } },
    },
    post: {
      tags: ["Votos"],
      summary: "Votar una coartada (un voto por usuario; el votante sale del JWT)",
      parameters: [idParam],
      requestBody: {
        required: true,
        content: { "application/json": { schema: { $ref: "#/components/schemas/VoteInput" } } },
      },
      responses: {
        201: { description: "Voto registrado; el primer voto pasa Submitted a UnderReview" },
        400: { description: "Calificaciones inválidas" },
        401: { description: "Falta el token" },
        403: { description: "No puedes votar tu propia coartada" },
        409: { description: "Ya votaste, o la coartada no es votable" },
      },
    },
  },
  "/api/alibis/{id}/report": {
    post: {
      tags: ["Reportes"],
      summary: "Reportar una coartada como falsa (3 reportes la exponen)",
      parameters: [idParam],
      requestBody: {
        content: {
          "application/json": {
            schema: { type: "object", properties: { reason: { type: "string", maxLength: 300 } } },
          },
        },
      },
      responses: {
        201: { description: "Reporte registrado; con 3 reportes pasa a Rejected y penaliza al creador (-10)" },
        401: { description: "Falta el token" },
        403: { description: "No puedes reportar tu propia coartada" },
        409: { description: "Ya reportaste esta coartada, o no es reportable" },
      },
    },
  },
  "/api/rankings/{type}": {
    get: {
      tags: ["Rankings"],
      summary: "Ranking de maestros del engaño",
      security: [],
      parameters: [
        {
          in: "path",
          name: "type",
          required: true,
          schema: {
            type: "string",
            enum: ["master-of-deceit", "most-creative", "most-consistent", "most-wanted"],
          },
        },
      ],
      responses: {
        200: {
          description: "Ranking ordenado de mayor a menor",
          content: {
            "application/json": {
              schema: { type: "array", items: { $ref: "#/components/schemas/RankingRow" } },
            },
          },
        },
        404: { description: "El tipo de ranking no existe" },
      },
    },
  },
};

export { swaggerSpec };
