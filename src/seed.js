// Seed según el enunciado: 3 guilds, 12 usuarios (4/4/4), 15 coartadas
// (3 Draft, 4 Submitted, 5 Approved, 3 Rejected), 30 votos, 5 cadenas de testigos.
import "dotenv/config";
import { connectDB, disconnectDB } from "./config/db.js";

import { User } from "./models/User.js";
import { Guild } from "./models/Guild.js";
import { Alibi } from "./models/Alibi.js";
import { AlibiDetail } from "./models/AlibiDetail.js";
import { Witness } from "./models/Witness.js";
import { Situation } from "./models/Situation.js";
import { AlibiRequest } from "./models/AlibiRequest.js";
import { Vote } from "./models/Vote.js";
import { ExposureReport } from "./models/ExposureReport.js";
import { recalculateAlibiCounters, addVersionSnapshot } from "./services/alibiService.js";
import { ALIBI_STATES } from "./utils/constants.js";

const GUILDS = [
  { name: "The Excuse Makers", description: "Excusas creativas armadas con arte." },
  { name: "The Detail Weavers", description: "Ninguna historia sin evidencia." },
  { name: "The Improvisers", description: "Excusas armadas sobre la marcha." },
];

// guild: índice en GUILDS. 4 CreativeExcuse, 4 DetailOriented, 4 Improviser.
const USERS = [
  { alias: "MenteMaestra", email: "mente@eia.edu.co", speciality: "CreativeExcuse", credibilityScore: 42, guild: 0 },
  { alias: "ElFantasma", email: "fantasma@eia.edu.co", speciality: "CreativeExcuse", credibilityScore: 48, guild: 0 },
  { alias: "SenorIncognito", email: "incognito@eia.edu.co", speciality: "CreativeExcuse", credibilityScore: 22, guild: 0 },
  { alias: "ProfesorExcusas", email: "profesor@eia.edu.co", speciality: "CreativeExcuse", credibilityScore: 15, guild: 0 },
  { alias: "SombraNocturna", email: "sombra@eia.edu.co", speciality: "DetailOriented", credibilityScore: 39, guild: 1 },
  { alias: "LaCoartada", email: "coartada@eia.edu.co", speciality: "DetailOriented", credibilityScore: 18, guild: 1 },
  { alias: "PlanPerfecto", email: "plan@eia.edu.co", speciality: "DetailOriented", credibilityScore: 5, guild: 1 },
  { alias: "LaEstratega", email: "estratega@eia.edu.co", speciality: "DetailOriented", credibilityScore: 27, guild: 1 },
  { alias: "AgenteTarde", email: "agente@eia.edu.co", speciality: "Improviser", credibilityScore: 31, guild: 2 },
  { alias: "NadieMeVio", email: "nadie@eia.edu.co", speciality: "Improviser", credibilityScore: 9, guild: 2 },
  { alias: "UltimoMinuto", email: "ultimo@eia.edu.co", speciality: "Improviser", credibilityScore: 2, guild: 2 },
  // Score negativo: demuestra el bloqueo de 7 días (req. 20).
  { alias: "TestigoSecreto", email: "testigo@eia.edu.co", speciality: "Improviser", credibilityScore: -4, guild: 2 },
];

const SITUATIONS = [
  { title: "Llegué tarde al parcial", description: "El parcial ya empezó y no estabas en el salón." },
  { title: "No hice el proyecto", description: "Hoy es la entrega y no hay nada que mostrar." },
  { title: "Necesito salir de clase", description: "Tienes que irte a mitad de la sesión sin levantar sospechas." },
  { title: "Falté a la exposición", description: "Tu grupo expuso sin ti." },
  { title: "No subí la tarea a tiempo", description: "La plataforma ya cerró la entrega." },
];

// 15 alibis: 3 Draft, 4 Submitted, 5 Approved, 3 Rejected (ninguna UnderReview).
// Los Draft pueden tener menos de 3 detalles; el resto cumple el mínimo.
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
  { title: "El apagón del barrio", situation: "No subí la tarea a tiempo", state: ALIBI_STATES.APPROVED,
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
  { title: "El error del sistema", situation: "La plataforma no registró mi entrega", state: ALIBI_STATES.REJECTED,
    story: "Subí el archivo antes de medianoche pero la plataforma no lo registró.",
    details: ["Captura del envío", "Correo automático de confirmación", "Otros compañeros con el mismo problema"] },
  { title: "El paro de transporte", situation: "No llegué al quiz", state: ALIBI_STATES.DRAFT,
    story: "Hubo paro de conductores y no había forma de llegar al campus.",
    details: ["Noticia del paro", "Captura de la app sin carros"] },
  { title: "La intoxicación del almuerzo", situation: "Me fui a mitad de clase", state: ALIBI_STATES.REJECTED,
    story: "Almorcé algo en mal estado y tuve que salir de urgencia.",
    details: ["Recibo del restaurante", "Mensaje al monitor", "Foto del menú del día"] },
  { title: "El compañero desaparecido", situation: "El trabajo grupal quedó incompleto", state: ALIBI_STATES.SUBMITTED,
    story: "Mi compañero de grupo nunca respondió y tuve que hacer todo solo.",
    details: ["Capturas del chat sin respuesta", "Historial del documento compartido", "Otros del grupo lo confirman"] },
  { title: "La inundación del apartamento", situation: "Perdí el material de estudio", state: ALIBI_STATES.DRAFT,
    story: "Se reventó una tubería y se dañaron mis apuntes y el computador.",
    details: ["Fotos del apartamento"] },
  // Rechazada por exposición: 3 reportes y penalización de 10 puntos ya aplicada.
  { title: "La doble cita académica", situation: "Falté a la asesoría", state: ALIBI_STATES.REJECTED, exposed: true,
    story: "Me programaron dos asesorías de materias distintas a la misma hora.",
    details: ["Captura del calendario", "Correo de la otra materia", "El otro profesor puede confirmarlo"] },
];

// 5 cadenas de testigos de 2 a 5 personas (total de testigos = índices de usuarios)
const WITNESS_CHAINS = [
  { alibiIndex: 0, witnessCount: 4 },
  { alibiIndex: 1, witnessCount: 3 },
  { alibiIndex: 6, witnessCount: 2 },
  { alibiIndex: 8, witnessCount: 5 },
  { alibiIndex: 4, witnessCount: 2 },
];

// 30 votos reales: 6 votos en cada una de las 5 coartadas aprobadas.
// Los votantes son usuarios distintos al dueño de la coartada.
const VOTES_PER_ALIBI = 6;

async function seed() {
  await connectDB(process.env.MONGODB_URI);

  console.log("Limpiando colecciones...");
  const models = [
    User, Guild, Alibi, AlibiDetail, Witness, Situation, AlibiRequest, Vote, ExposureReport,
  ];
  await Promise.all(models.map((model) => model.deleteMany({})));
  // Elimina índices que ya no existen en los esquemas (por ejemplo del módulo viejo)
  await Promise.all(models.map((model) => model.syncIndexes()));

  console.log("Creando guilds...");
  const guilds = await Guild.insertMany(GUILDS);

  console.log("Creando usuarios (password de todos: password123)...");
  const users = [];
  for (const data of USERS) {
    const { guild, ...fields } = data;
    const user = new User({ ...fields, guild: guilds[guild]._id });
    await user.setPassword("password123");
    if (fields.credibilityScore < 0) {
      const until = new Date();
      until.setDate(until.getDate() + 7);
      user.blockedUntil = until;
    }
    await user.save();
    users.push(user);
  }

  console.log("Creando situaciones...");
  const situations = await Situation.insertMany(
    SITUATIONS.map((data, index) => ({ ...data, createdBy: users[index]._id }))
  );

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
      situationId: situations[index % situations.length]._id,
      exposed: Boolean(data.exposed),
      penaltyApplied: Boolean(data.exposed),
      reportCount: data.exposed ? 3 : 0,
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

  console.log("Creando 30 votos...");
  const votes = [];
  const approved = alibis.filter((a) => a.state === ALIBI_STATES.APPROVED);
  for (const [alibiIdx, alibi] of approved.entries()) {
    const voters = users.filter((u) => !u._id.equals(alibi.owner)).slice(alibiIdx, alibiIdx + VOTES_PER_ALIBI);
    for (const [voterIdx, voter] of voters.entries()) {
      votes.push({
        alibiId: alibi._id,
        voterId: voter._id,
        credibility: 3 + ((alibiIdx + voterIdx) % 3),
        creativity: 2 + ((alibiIdx * 2 + voterIdx) % 4),
        consistency: 3 + ((alibiIdx + voterIdx * 2) % 3),
      });
    }
  }
  await Vote.insertMany(votes);

  console.log("Creando reportes de la coartada expuesta...");
  const exposed = alibis.find((a) => a.exposed);
  const reporters = users.filter((u) => !u._id.equals(exposed.owner)).slice(0, 3);
  await ExposureReport.insertMany(
    reporters.map((user) => ({ alibiId: exposed._id, reporterId: user._id, reason: "Esta historia no cuadra." }))
  );

  console.log("Creando peticiones de coartadas...");
  await AlibiRequest.insertMany([
    { situationId: situations[0]._id, requester: users[9]._id, message: "Necesito algo creíble para mañana." },
    { situationId: situations[2]._id, requester: users[10]._id, message: "¿Alguien con una salida elegante?" },
  ]);

  console.log("Recalculando contadores e índices...");
  for (const alibi of alibis) {
    await recalculateAlibiCounters(alibi._id);
    await addVersionSnapshot(alibi._id);
  }

  const byState = {};
  for (const alibi of alibis) byState[alibi.state] = (byState[alibi.state] || 0) + 1;

  console.log(`
Listo:
  ${guilds.length} guilds
  ${users.length} usuarios (password: password123)
  ${alibis.length} coartadas ${JSON.stringify(byState)}
  ${WITNESS_CHAINS.length} cadenas de testigos
  ${votes.length} votos
  ${situations.length} situaciones
`);

  await disconnectDB();
}

seed().catch(async (error) => {
  console.error("Error en el seed:", error);
  await disconnectDB();
  process.exit(1);
});
