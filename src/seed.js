import "dotenv/config";
import { connectDB, disconnectDB } from "./config/db.js";
import { ExposureReport } from "./models/ExposureReport.js";
import { Situation } from "./models/Situation.js";
import { Vote } from "./models/Vote.js";
import { recalculateAlibi } from "./services/credibility.js";

const aliases = [
  "El Fantasma",
  "Mente Maestra",
  "Sombra Nocturna",
  "Agente Tarde",
  "La Estratega",
  "Señor Incógnito",
  "La Coartada",
  "Profesor Excusas",
  "Nadie Me Vio",
  "Plan Perfecto",
  "Último Minuto",
  "Testigo Secreto",
];

const situationData = [
  ["Llegada tarde a clase", "Explica por qué llegaste tarde a clase."],
  ["Entrega tardía", "Justifica por qué no entregaste el trabajo a tiempo."],
  ["Ausencia en exposición", "Explica por qué no llegaste a la exposición."],
  ["Cámara apagada", "Explica por qué no encendiste la cámara."],
  ["Salida del laboratorio", "Explica por qué saliste antes de tiempo."],
];

function createAlibi(index) {
  const creatorIndex = index % aliases.length;

  return {
    externalId: `alibi-${index + 1}`,
    title: `Coartada comunitaria ${index + 1}`,
    story: `Historia de prueba para la coartada número ${index + 1}.`,
    creatorId: `creator-${creatorIndex + 1}`,
    creatorAlias: aliases[creatorIndex],
    witnessCount: index % 4,
  };
}

async function seed() {
  await connectDB(process.env.MONGODB_URI);

  await Promise.all([
    Situation.deleteMany({}),
    Vote.deleteMany({}),
    ExposureReport.deleteMany({}),
  ]);

  const allAlibis = Array.from({ length: 15 }, (_, index) => createAlibi(index));

  await Situation.insertMany(
    situationData.map(([title, description], index) => ({
      title,
      description,
      alibis: allAlibis.slice(index * 3, index * 3 + 3),
    }))
  );

  await Vote.insertMany(
    Array.from({ length: 30 }, (_, index) => ({
      alibiId: `alibi-${(index % 15) + 1}`,
      voterId: `seed-voter-${index + 1}`,
      credibility: (index % 5) + 1,
      creativity: ((index + 1) % 5) + 1,
      consistency: ((index + 2) % 5) + 1,
    }))
  );

  for (const alibi of allAlibis) {
    await recalculateAlibi(alibi.externalId);
  }

  console.log("Datos independientes de Persona B creados correctamente.");
  await disconnectDB();
}

seed().catch(async (error) => {
  console.error(error);
  await disconnectDB();
  process.exit(1);
});
