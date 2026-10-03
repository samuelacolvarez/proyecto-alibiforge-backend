// Seed data combinado: Persona A (usuarios, guilds, coartadas, testigos)
// + Persona B (situaciones, votos, reportes de exposición)
import "dotenv/config";
import { connectDB, disconnectDB } from "./config/db.js";

import { User } from "./models/User.js";
import { Guild } from "./models/Guild.js";
import { Alibi } from "./models/Alibi.js";
import { AlibiDetail } from "./models/AlibiDetail.js";
import { Witness } from "./models/Witness.js";
import { recalculateAlibiCounters } from "./services/alibiService.js";
import { ALIBI_STATES } from "./utils/constants.js";

import { ExposureReport } from "./models/ExposureReport.js";
import { Situation } from "./models/Situation.js";
import { Vote } from "./models/Vote.js";
import { recalculateAlibi } from "./services/credibility.js";

// ---------- Datos de Samuel ----------

const GUILDS = [
  { name: "Los Improvisadores", description: "Excusas armadas sobre la marcha." },
  { name: "Orden del Detalle", description: "Ninguna historia sin evidencia." },
  { name: "Círculo de Conspiradores", description: "Nunca caemos solos." },
];

const USERS = [
  { alias: "ElFantasma", email: "fantasma@eia.edu.co", speciality: "Conspirator", credibilityScore: 48 },
  { alias: "MenteMaestra", email: "mente@eia.edu.co", speciality: "CreativeExcuse", credibilityScore: 42 },
  { alias: "SombraNocturna", email: "sombra@eia.edu.co", speciality: "DetailOriented", credibilityScore: 39 },
  { alias: "AgenteTarde", email: "agente@eia.edu.co", speciality: "Improviser", credibilityScore: 31 },
  { alias: "LaEstratega", email: "estratega@eia.edu.co", speciality: "Conspirator", credibilityScore: 27 },
  { alias: "SenorIncognito", email: "incognito@eia.edu.co", speciality: "CreativeExcuse", credibilityScore: 22 },
  { alias: "LaCoartada", email: "coartada@eia.edu.co", speciality: "DetailOriented", credibilityScore: 18 },
  { alias: "ProfesorExcusas", email: "profesor@eia.edu.co", speciality: "CreativeExcuse", credibilityScore: 15 },
  { alias: "NadieMeVio", email: "nadie@eia.edu.co", speciality: "Improviser", credibilityScore: 9 },
  { alias: "PlanPerfecto", email: "plan@eia.edu.co", speciality: "DetailOriented", credibilityScore: 5 },
  { alias: "UltimoMinuto", email: "ultimo@eia.edu.co", speciality: "Improviser", credibilityScore: 2 },
  { alias: "TestigoSecreto", email: "testigo@eia.edu.co", speciality: "Conspirator", credibilityScore: -4 },
];

const ALIBIS = [
  { title: "La cita con el dentista", situation: "Llegué tarde al parcial", state: ALIBI_STATES.APPROVED,
    story: "Tuve una urgencia dental esa mañana y la clínica no abría hasta las 8.",
    details: ["Ticket de la clínica con hora impresa", "El odontólogo puede confirmarlo", "Foto de la sala de espera", "Receta de analgésicos", "Pago con tarjeta registrado"] },
  { title: "El semestre perdido", situation: "No entregué el proyecto final", state: ALIBI_STATES.APPROVED,
    story: "Se me dañó el portátil la noche anterior y el backup estaba incompleto.",
    details: ["Factura del servicio técnico", "Captura del chat con soporte", "Testigo que vio el equipo", "Backup parcial en la nube", "Correo enviado al profesor"] },
  { title: "El vuelo cancelado", situation: "Falté a la sustentación grupal", state: ALIBI_STATES.DRAFT,
    story: "Mi vuelo de regreso se canceló por mal clima en el aeropuerto.",
    details: ["Correo de la aerolínea"] },
  { title: "La gripa del siglo", situation: "Falté tres clases seguidas", state: ALIBI_STATES.SUBMITTED,
    story: "Estuve con fiebre alta toda la semana y el médico me incapacitó.",
    details: ["Incapacidad médica", "Fórmula de la farmacia", "Mi compañero de cuarto me vio"] },
  { title: "El trancón interminable", situation: "Llegué tarde a la exposición", state: ALIBI_STATES.SUBMITTED,
    story: "Hubo un accidente en la autopista y el tráfico estuvo parado una hora.",
    details: ["Captura del mapa con el trancón", "Noticia del accidente", "Recibo del taxi"] },
  { title: "El apagón del barrio", situation: "No subí la tarea a tiempo", state: ALIBI_STATES.UNDER_REVIEW,
    story: "Se fue la luz en todo el sector desde las 6pm y no volvió hasta la madrugada.",
    details: ["Aviso de la empresa de energía", "Vecinos pueden confirmar", "Foto del barrio a oscuras", "Datos móviles agotados"] },
  { title: "La boda de mi prima", situation: "Falté al laboratorio", state: ALIBI_STATES.APPROVED,
    story: "Era la boda de mi prima en otra ciudad y viajé el fin de semana.",
    details: ["Invitación formal", "Fotos con fecha", "Tiquetes de bus", "Mi tía puede confirmarlo"] },
  { title: "El celular robado", situation: "No contesté los mensajes del grupo", state: ALIBI_STATES.SUBMITTED,
    story: "Me robaron el celular el viernes y solo pude recuperar la línea el lunes.",
    details: ["Denuncia en la policía", "Reporte del operador", "Testigo del robo"] },
  { title: "La emergencia familiar", situation: "Pedí prórroga del examen", state: ALIBI_STATES.APPROVED,
    story: "Mi abuela tuvo una caída y tuve que acompañarla a urgencias.",
    details: ["Registro de urgencias", "Mensajes con mi familia", "Factura de la clínica", "Mi madre puede confirmarlo", "Foto en la sala de espera", "Historial de llamadas"] },
  { title: "El error del sistema", situation: "La plataforma no registró mi entrega", state: ALIBI_STATES.UNDER_REVIEW,
    story: "Subí el archivo antes de medianoche pero la plataforma no lo registró.",
    details: ["Captura del envío", "Correo automático de confirmación", "Otros compañeros con el mismo problema"] },
  { title: "El paro de transporte", situation: "No llegué al quiz", state: ALIBI_STATES.DRAFT,
    story: "Hubo paro de conductores y no había forma de llegar al campus.",
    details: ["Noticia del paro", "Captura de la app sin carros"] },
  { title: "La intoxicación del almuerzo", situation: "Me fui a mitad de clase", state: ALIBI_STATES.REJECTED,
    story: "Almorcé algo en mal estado y tuve que salir de urgencia.",
    details: ["Recibo del restaurante", "Mensaje al monitor"] },
  { title: "El compañero desaparecido", situation: "El trabajo grupal quedó incompleto", state: ALIBI_STATES.SUBMITTED,
    story: "Mi compañero de grupo nunca respondió y tuve que hacer todo solo.",
    details: ["Capturas del chat sin respuesta", "Historial del documento compartido", "Otros del grupo lo confirman"] },
  { title: "La inundación del apartamento", situation: "Perdí el material de estudio", state: ALIBI_STATES.DRAFT,
    story: "Se reventó una tubería y se dañaron mis apuntes y el computador.",
    details: ["Fotos del apartamento"] },
  { title: "La doble cita académica", situation: "Falté a la asesoría", state: ALIBI_STATES.UNDER_REVIEW,
    story: "Me programaron dos asesorías de materias distintas a la misma hora.",
    details: ["Captura del calendario", "Correo de la otra materia", "El otro profesor puede confirmarlo"] },
];

const WITNESS_CHAINS = [
  { alibiIndex: 0, witnessCount: 4 },
  { alibiIndex: 1, witnessCount: 3 },
  { alibiIndex: 6, witnessCount: 2 },
  { alibiIndex: 8, witnessCount: 5 },
  { alibiIndex: 4, witnessCount: 2 },
];

// ------ Datos de Matías ----- 
const aliases = [
  "El Fantasma", "Mente Maestra", "Sombra Nocturna", "Agente Tarde", "La Estratega",
  "Señor Incógnito", "La Coartada", "Profesor Excusas", "Nadie Me Vio",
  "Plan Perfecto", "Último Minuto", "Testigo Secreto",
];

const situationData = [
  ["Llegada tarde a clase", "Explica por qué llegaste tarde a clase."],
  ["Entrega tardía", "Justifica por qué no entregaste el trabajo a tiempo."],
  ["Ausencia en exposición", "Explica por qué no llegaste a la exposición."],
  ["Cámara apagada", "Explica por qué no encendiste la cámara."],
  ["Salida del laboratorio", "Explica por qué saliste antes de tiempo."],
];

function createCommunityAlibi(index) {
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

  // ----- Limpieza -----
  console.log("Limpiando colecciones...");
  await Promise.all([
    User.deleteMany({}),
    Guild.deleteMany({}),
    Alibi.deleteMany({}),
    AlibiDetail.deleteMany({}),
    Witness.deleteMany({}),
    Situation.deleteMany({}),
    Vote.deleteMany({}),
    ExposureReport.deleteMany({}),
  ]);

  // ----- Persona A: guilds, usuarios, coartadas, testigos -----
  console.log("Creando guilds...");
  const guilds = await Guild.insertMany(GUILDS);

  console.log("Creando usuarios (password de todos: password123)...");
  const users = [];
  for (const [index, data] of USERS.entries()) {
    const user = new User({ ...data, guild: guilds[index % guilds.length]._id });
    await user.setPassword("password123");
    if (data.credibilityScore < 0) {
      const until = new Date();
      until.setDate(until.getDate() + 7);
      user.blockedUntil = until;
    }
    await user.save();
    users.push(user);
  }

  console.log("Creando coartadas y detalles...");
  const alibis = [];
  for (const [index, data] of ALIBIS.entries()) {
    const owner = users[index % users.length];
    const alibi = await Alibi.create({
      title: data.title,
      situation: data.situation,
      story: data.story,
      state: data.state,
      owner: owner._id,
    });
    await AlibiDetail.insertMany(data.details.map((text) => ({ alibi: alibi._id, text })));
    alibis.push(alibi);
  }

  console.log("Creando cadenas de testigos...");
  for (const chain of WITNESS_CHAINS) {
    const alibi = alibis[chain.alibiIndex];
    const candidates = users.filter((u) => !u._id.equals(alibi.owner));
    for (const user of candidates.slice(0, chain.witnessCount)) {
      await Witness.create({ alibi: alibi._id, user: user._id });
    }
  }

  console.log("Recalculando contadores de Persona A...");
  for (const alibi of alibis) {
    await recalculateAlibiCounters(alibi._id);
  }

  // ----- situaciones, votos -----
  console.log("Creando situaciones y votos...");
  const communityAlibis = Array.from({ length: 15 }, (_, index) => createCommunityAlibi(index));

  await Situation.insertMany(
    situationData.map(([title, description], index) => ({
      title,
      description,
      alibis: communityAlibis.slice(index * 3, index * 3 + 3),
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

  for (const alibi of communityAlibis) {
    await recalculateAlibi(alibi.externalId);
  }

  console.log(`
Listo:
  ${guilds.length} guilds
  ${users.length} usuarios (password: password123)
  ${alibis.length} coartadas (Persona A)
  ${WITNESS_CHAINS.length} cadenas de testigos
  ${situationData.length} situaciones y 30 votos (Persona B)
`);

  await disconnectDB();
}

seed().catch(async (error) => {
  console.error("Error en el seed:", error);
  await disconnectDB();
  process.exit(1);
});