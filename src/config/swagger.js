import swaggerJsdoc from "swagger-jsdoc";

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "AlibiForge API — Identidad y Coartadas (Persona A)",
      version: "1.0.0",
      description:
        "Endpoints de autenticación, perfil, coartadas y cadena de testigos.",
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
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ["./src/routes/*.js"],
};

export const swaggerSpec = swaggerJsdoc(options);

// Documentación del módulo de Persona B (situaciones, votos, reportes, rankings)
export const swaggerDocument = {
  openapi: "3.0.3",
  info: {
    title: "AlibiForge API - Matias",
    version: "1.0.0",
    description:
      "API independiente de Matias para situaciones, votos, reportes y rankings.",
  },
  servers: [
    {
      url: "http://localhost:4000",
      description: "Servidor local",
    },
  ],
  tags: [
    { name: "Estado", description: "Estado del servicio" },
    { name: "Situaciones", description: "Administración de situaciones" },
    { name: "Votos", description: "Votación de coartadas comunitarias" },
    { name: "Reportes", description: "Reportes de coartadas falsas" },
    { name: "Rankings", description: "Clasificaciones de la comunidad" },
  ],
  paths: {
    "/api/health": {
      get: {
        tags: ["Estado"],
        summary: "Consultar el estado del backend",
        responses: {
          200: {
            description: "El servicio está funcionando",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Health" },
              },
            },
          },
        },
      },
    },
    "/api/situations": {
      get: {
        tags: ["Situaciones"],
        summary: "Listar o buscar situaciones",
        parameters: [
          {
            name: "search",
            in: "query",
            required: false,
            description: "Texto que debe aparecer en el título",
            schema: { type: "string" },
          },
        ],
        responses: {
          200: {
            description: "Listado de situaciones",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: { $ref: "#/components/schemas/Situation" },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ["Situaciones"],
        summary: "Crear una situación",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateSituation" },
            },
          },
        },
        responses: {
          201: {
            description: "Situación creada correctamente",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: { type: "string" },
                    situation: { $ref: "#/components/schemas/Situation" },
                  },
                },
              },
            },
          },
          400: { $ref: "#/components/responses/BadRequest" },
        },
      },
    },
    "/api/situations/{id}": {
      get: {
        tags: ["Situaciones"],
        summary: "Consultar una situación por id",
        parameters: [{ $ref: "#/components/parameters/SituationId" }],
        responses: {
          200: {
            description: "Situación encontrada",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Situation" },
              },
            },
          },
          404: { $ref: "#/components/responses/NotFound" },
        },
      },
    },
    "/api/alibis/{id}/votes": {
      get: {
        tags: ["Votos"],
        summary: "Consultar los votos de una coartada",
        parameters: [{ $ref: "#/components/parameters/AlibiId" }],
        responses: {
          200: {
            description: "Votos e índice de credibilidad",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    votes: {
                      type: "array",
                      items: { $ref: "#/components/schemas/Vote" },
                    },
                    credibilityIndex: { type: "number", minimum: 0, maximum: 5 },
                  },
                },
              },
            },
          },
          404: { $ref: "#/components/responses/NotFound" },
        },
      },
      post: {
        tags: ["Votos"],
        summary: "Registrar un voto",
        parameters: [{ $ref: "#/components/parameters/AlibiId" }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateVote" },
            },
          },
        },
        responses: {
          201: { description: "Voto registrado y credibilidad recalculada" },
          400: { $ref: "#/components/responses/BadRequest" },
          404: { $ref: "#/components/responses/NotFound" },
          409: { $ref: "#/components/responses/Conflict" },
        },
      },
    },
    "/api/alibis/{id}/report": {
      post: {
        tags: ["Reportes"],
        summary: "Reportar una coartada como falsa",
        parameters: [{ $ref: "#/components/parameters/AlibiId" }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateReport" },
            },
          },
        },
        responses: {
          201: { description: "Reporte registrado y reglas de exposición aplicadas" },
          400: { $ref: "#/components/responses/BadRequest" },
          404: { $ref: "#/components/responses/NotFound" },
          409: { $ref: "#/components/responses/Conflict" },
        },
      },
    },
    "/api/rankings/{type}": {
      get: {
        tags: ["Rankings"],
        summary: "Consultar un ranking",
        parameters: [
          {
            name: "type",
            in: "path",
            required: true,
            schema: {
              type: "string",
              enum: [
                "master-of-deceit",
                "most-creative",
                "most-consistent",
                "most-wanted",
              ],
            },
          },
        ],
        responses: {
          200: {
            description: "Ranking ordenado de mayor a menor puntuación",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: { $ref: "#/components/schemas/RankingEntry" },
                },
              },
            },
          },
          404: { $ref: "#/components/responses/NotFound" },
        },
      },
    },
  },
  components: {
    parameters: {
      SituationId: {
        name: "id",
        in: "path",
        required: true,
        description: "ObjectId de MongoDB de la situación",
        schema: { type: "string", example: "66c000000000000000000001" },
      },
      AlibiId: {
        name: "id",
        in: "path",
        required: true,
        description: "Identificador externo de la coartada comunitaria",
        schema: { type: "string", example: "alibi-001" },
      },
    },
    responses: {
      BadRequest: {
        description: "Datos inválidos",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/Error" },
          },
        },
      },
      NotFound: {
        description: "Recurso no encontrado",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/Error" },
          },
        },
      },
      Conflict: {
        description: "Operación duplicada o no permitida",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/Error" },
          },
        },
      },
    },
    schemas: {
      Health: {
        type: "object",
        properties: {
          status: { type: "string", example: "ok" },
          service: { type: "string", example: "alibiforge-persona-b" },
        },
      },
      CommunityAlibi: {
        type: "object",
        required: ["externalId", "title", "story", "creatorId", "creatorAlias"],
        properties: {
          externalId: { type: "string", example: "alibi-001" },
          title: { type: "string", maxLength: 120 },
          story: { type: "string", maxLength: 500 },
          creatorId: { type: "string", example: "user-001" },
          creatorAlias: { type: "string", example: "Sombra Azul" },
          witnessCount: { type: "integer", minimum: 0, default: 0 },
          credibilityIndex: { type: "number", minimum: 0, maximum: 5, default: 0 },
          exposed: { type: "boolean", default: false },
          reportCount: { type: "integer", minimum: 0, default: 0 },
          penaltyPoints: { type: "number", default: 0 },
          penaltyApplied: { type: "boolean", default: false },
        },
      },
      Situation: {
        type: "object",
        properties: {
          _id: { type: "string" },
          title: { type: "string" },
          description: { type: "string" },
          alibis: {
            type: "array",
            items: { $ref: "#/components/schemas/CommunityAlibi" },
          },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      CreateSituation: {
        type: "object",
        required: ["title", "description"],
        properties: {
          title: { type: "string", maxLength: 120, example: "Llegué tarde al trabajo" },
          description: {
            type: "string",
            maxLength: 1000,
            example: "Crea una coartada convincente para justificar el retraso.",
          },
          alibis: {
            type: "array",
            items: { $ref: "#/components/schemas/CommunityAlibi" },
            default: [],
          },
        },
      },
      Vote: {
        type: "object",
        properties: {
          _id: { type: "string" },
          alibiId: { type: "string" },
          voterId: { type: "string" },
          credibility: { type: "integer", minimum: 1, maximum: 5 },
          creativity: { type: "integer", minimum: 1, maximum: 5 },
          consistency: { type: "integer", minimum: 1, maximum: 5 },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      CreateVote: {
        type: "object",
        required: ["voterId", "credibility", "creativity", "consistency"],
        properties: {
          voterId: { type: "string", example: "visitor-001" },
          credibility: { type: "integer", minimum: 1, maximum: 5, example: 4 },
          creativity: { type: "integer", minimum: 1, maximum: 5, example: 5 },
          consistency: { type: "integer", minimum: 1, maximum: 5, example: 4 },
        },
      },
      CreateReport: {
        type: "object",
        required: ["reporterId"],
        properties: {
          reporterId: { type: "string", example: "visitor-002" },
          reason: {
            type: "string",
            maxLength: 300,
            example: "La historia contradice los detalles publicados.",
          },
        },
      },
      RankingEntry: {
        type: "object",
        properties: {
          id: { type: "string", example: "user-001" },
          alias: { type: "string", example: "Sombra Azul" },
          score: { type: "number", example: 4.5 },
        },
      },
      Error: {
        type: "object",
        properties: {
          message: { type: "string" },
        },
      },
    },
  },
};