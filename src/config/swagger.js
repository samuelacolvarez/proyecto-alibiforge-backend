import swaggerJsdoc from "swagger-jsdoc";

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "AlibiForge API",
      version: "1.0.0",
      description:
        "API para la aplicación AlibiForge, que permite a los usuarios crear y compartir coartadas y testigos.",
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
  // Swagger lee los comentarios @swagger de estos archivos
  apis: ["./src/routes/*.js"],
};

export const swaggerSpec = swaggerJsdoc(options);