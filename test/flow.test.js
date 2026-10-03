import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { MongoMemoryServer } from "mongodb-memory-server";
import { createApp } from "../src/app.js";
import { connectDB, disconnectDB } from "../src/config/db.js";

// Prueba de flujo completo contra una MongoDB en memoria:
// registro -> coartada con detalles y testigos -> envío -> votos -> revisión
// -> exposición con 3 reportes -> penalización y bloqueo -> desertar -> rankings
// -> situaciones ordenadas por Credibility Index.

process.env.JWT_SECRET = "secreto-de-pruebas";

let mongoServer;
let httpServer;
let baseUrl;
const tokens = {};
const ids = {};

async function api(path, { method = "GET", token, body } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  return { status: response.status, body: text ? JSON.parse(text) : null };
}

async function registerAndLogin(alias, speciality) {
  const email = `${alias}@test.edu`;
  const password = "password123";
  const registered = await api("/auth/register", {
    method: "POST",
    body: { alias, email, password, speciality },
  });
  assert.equal(registered.status, 201);
  ids[alias] = registered.body.id;

  const login = await api("/auth/login", {
    method: "POST",
    body: { identifier: alias, password },
  });
  assert.equal(login.status, 200);
  tokens[alias] = login.body.token;
}

async function score(alias) {
  const me = await api("/users/me", { token: tokens[alias] });
  return me.body;
}

const threeDetails = ["Detalle uno", "Detalle dos", "Detalle tres"];

before(async () => {
  const mongoOptions =
    process.platform === "linux" ? { instance: { args: ["--nounixsocket"] } } : {};

  mongoServer = await MongoMemoryServer.create(mongoOptions);
  await connectDB(mongoServer.getUri());

  httpServer = createApp().listen(0);
  baseUrl = `http://127.0.0.1:${httpServer.address().port}`;

  for (const alias of ["ana", "bruno", "carla", "dario", "elena", "fabio"]) {
    await registerAndLogin(alias, "CreativeExcuse");
  }
});

after(async () => {
  if (httpServer) httpServer.close();
  await disconnectDB();
  if (mongoServer) await mongoServer.stop();
});

test("crear coartada con detalles y testigos calcula contadores e índice", async () => {
  const created = await api("/alibis", {
    method: "POST",
    token: tokens.ana,
    body: {
      title: "El apagón",
      situation: "Llegué tarde al parcial",
      story: "Se fue la luz en todo el barrio.",
      details: ["d1", "d2", "d3", "d4", "d5"],
      witnesses: ["bruno", ids.carla],
    },
  });

  assert.equal(created.status, 201);
  assert.equal(created.body.state, "Draft");
  assert.equal(created.body.details.length, 5);
  assert.equal(created.body.witnessCount, 2);
  assert.equal(created.body.complexityScore, 10);
  assert.equal(created.body.versionCount, 1);
  ids.alibiAna = created.body.id;

  const witnesses = await api(`/alibis/${ids.alibiAna}/witnesses`);
  assert.deepEqual(witnesses.body.map((w) => w.alias).sort(), ["bruno", "carla"]);
  assert.equal(witnesses.body.find((w) => w.alias === "bruno").id, ids.bruno);

  const versions = await api(`/alibis/${ids.alibiAna}/versions`);
  assert.equal(versions.body.length, 1);
  assert.equal(versions.body[0].details.length, 5);
});

test("editar el borrador agrega una versión", async () => {
  const updated = await api(`/alibis/${ids.alibiAna}`, {
    method: "PUT",
    token: tokens.ana,
    body: { story: "Se fue la luz y el semáforo no funcionaba." },
  });
  assert.equal(updated.status, 200);
  assert.equal(updated.body.versionCount, 2);
});

test("enviar, votar y recalcular el índice con la fórmula del enunciado", async () => {
  const submitted = await api(`/alibis/${ids.alibiAna}/submit`, {
    method: "POST",
    token: tokens.ana,
  });
  assert.equal(submitted.body.state, "Submitted");
  // Sin votos: 0*10 + 2 testigos*2 + 10 complejidad = 14
  assert.equal(submitted.body.credibilityIndex, 14);

  const noToken = await api(`/api/alibis/${ids.alibiAna}/votes`, {
    method: "POST",
    body: { credibility: 5, creativity: 5, consistency: 5 },
  });
  assert.equal(noToken.status, 401);

  const ownVote = await api(`/api/alibis/${ids.alibiAna}/votes`, {
    method: "POST",
    token: tokens.ana,
    body: { credibility: 5, creativity: 5, consistency: 5 },
  });
  assert.equal(ownVote.status, 403);

  const first = await api(`/api/alibis/${ids.alibiAna}/votes`, {
    method: "POST",
    token: tokens.dario,
    body: { credibility: 5, creativity: 5, consistency: 5 },
  });
  assert.equal(first.status, 201);
  assert.equal(first.body.state, "UnderReview");
  // 5*10 + 4 + 10 = 64
  assert.equal(first.body.credibilityIndex, 64);

  const second = await api(`/api/alibis/${ids.alibiAna}/votes`, {
    method: "POST",
    token: tokens.elena,
    body: { credibility: 3, creativity: 3, consistency: 3 },
  });
  // promedio 4 -> 4*10 + 4 + 10 = 54
  assert.equal(second.body.averageScore, 4);
  assert.equal(second.body.credibilityIndex, 54);

  const duplicate = await api(`/api/alibis/${ids.alibiAna}/votes`, {
    method: "POST",
    token: tokens.dario,
    body: { credibility: 1, creativity: 1, consistency: 1 },
  });
  assert.equal(duplicate.status, 409);

  const invalid = await api(`/api/alibis/${ids.alibiAna}/votes`, {
    method: "POST",
    token: tokens.fabio,
    body: { credibility: 8, creativity: 1, consistency: 1 },
  });
  assert.equal(invalid.status, 400);
});

test("un testigo nuevo suma 2 puntos al índice (req. 15)", async () => {
  const joined = await api(`/alibis/${ids.alibiAna}/witnesses`, {
    method: "POST",
    token: tokens.fabio,
  });
  assert.equal(joined.status, 201);

  const detail = await api(`/alibis/${ids.alibiAna}`);
  assert.equal(detail.body.witnessCount, 3);
  assert.equal(detail.body.credibilityIndex, 56);
});

test("la revisión sigue la máquina de estados", async () => {
  const byOwner = await api(`/alibis/${ids.alibiAna}/review`, {
    method: "POST",
    token: tokens.ana,
    body: { decision: "approve" },
  });
  assert.equal(byOwner.status, 403);

  const approved = await api(`/alibis/${ids.alibiAna}/review`, {
    method: "POST",
    token: tokens.bruno,
    body: { decision: "approve" },
  });
  assert.equal(approved.status, 200);
  assert.equal(approved.body.state, "Approved");

  const again = await api(`/alibis/${ids.alibiAna}/review`, {
    method: "POST",
    token: tokens.bruno,
    body: { decision: "review" },
  });
  assert.equal(again.status, 400);
});

test("3 reportes exponen la coartada, penalizan al dueño y lo bloquean", async () => {
  for (const alias of ["dario", "elena"]) {
    const report = await api(`/api/alibis/${ids.alibiAna}/report`, {
      method: "POST",
      token: tokens[alias],
    });
    assert.equal(report.status, 201);
    assert.equal(report.body.isExposed, false);
  }

  const third = await api(`/api/alibis/${ids.alibiAna}/report`, {
    method: "POST",
    token: tokens.fabio,
  });
  assert.equal(third.status, 201);
  assert.equal(third.body.isExposed, true);
  assert.equal(third.body.penaltyApplied, true);

  const detail = await api(`/alibis/${ids.alibiAna}`);
  assert.equal(detail.body.state, "Rejected");
  assert.equal(detail.body.exposed, true);
  assert.equal(detail.body.credibilityIndex, 0);

  const ana = await score("ana");
  assert.equal(ana.credibilityScore, -10);
  assert.ok(ana.blockedUntil);

  const blocked = await api("/alibis", {
    method: "POST",
    token: tokens.ana,
    body: { title: "Otra", situation: "Otra situación", story: "Historia", details: threeDetails },
  });
  assert.equal(blocked.status, 403);

  // La penalización no se repite
  const extra = await api(`/api/alibis/${ids.alibiAna}/report`, {
    method: "POST",
    token: tokens.carla,
  });
  assert.equal(extra.status, 409);
  assert.equal((await score("ana")).credibilityScore, -10);
});

test("desertar de la cadena penaliza 2 puntos al dueño y a los testigos restantes", async () => {
  const created = await api("/alibis", {
    method: "POST",
    token: tokens.carla,
    body: {
      title: "La cadena",
      situation: "No hice el proyecto",
      story: "Todos lo vimos.",
      details: threeDetails,
      witnesses: ["dario", "elena"],
    },
  });
  assert.equal(created.status, 201);
  ids.alibiCarla = created.body.id;

  await api(`/alibis/${ids.alibiCarla}/submit`, { method: "POST", token: tokens.carla });

  const defected = await api(`/alibis/${ids.alibiCarla}/witnesses/me`, {
    method: "DELETE",
    token: tokens.dario,
  });
  assert.equal(defected.status, 200);
  assert.deepEqual(defected.body.map((w) => w.alias), ["elena"]);

  assert.equal((await score("carla")).credibilityScore, -2);
  assert.equal((await score("elena")).credibilityScore, -2);
  assert.equal((await score("dario")).credibilityScore, 0);
});

test("rankings con alias reales", async () => {
  const deceit = await api("/api/rankings/master-of-deceit");
  assert.equal(deceit.status, 200);
  // Solo ana recibió votos: credibilidad (5 + 3) / 2 = 4
  assert.deepEqual(deceit.body.map((row) => [row.alias, row.score]), [["ana", 4]]);

  const wanted = await api("/api/rankings/most-wanted");
  assert.deepEqual(wanted.body.map((row) => [row.alias, row.score]), [
    ["ana", 1],
    ["carla", 1],
  ]);

  const unknown = await api("/api/rankings/no-existe");
  assert.equal(unknown.status, 404);
});

test("las situaciones listan sus coartadas ordenadas por índice y aceptan peticiones", async () => {
  const noAuth = await api("/api/situations", {
    method: "POST",
    body: { title: "Sin sesión", description: "No debería crearse" },
  });
  assert.equal(noAuth.status, 401);

  const created = await api("/api/situations", {
    method: "POST",
    token: tokens.elena,
    body: { title: "Necesito salir de clase", description: "¿Qué coartada uso?" },
  });
  assert.equal(created.status, 201);
  const situationId = created.body.situation.id;

  const make = async (alias, title) => {
    const alibi = await api("/alibis", {
      method: "POST",
      token: tokens[alias],
      body: { title, story: "Historia", details: threeDetails, situationId },
    });
    assert.equal(alibi.status, 201);
    await api(`/alibis/${alibi.body.id}/submit`, { method: "POST", token: tokens[alias] });
    return alibi.body.id;
  };

  const lowId = await make("dario", "Coartada floja");
  const highId = await make("fabio", "Coartada sólida");

  await api(`/api/alibis/${lowId}/votes`, {
    method: "POST",
    token: tokens.bruno,
    body: { credibility: 1, creativity: 1, consistency: 1 },
  });
  await api(`/api/alibis/${highId}/votes`, {
    method: "POST",
    token: tokens.bruno,
    body: { credibility: 5, creativity: 5, consistency: 5 },
  });

  const detail = await api(`/api/situations/${situationId}`);
  assert.equal(detail.status, 200);
  assert.deepEqual(
    detail.body.alibis.map((alibi) => alibi.id),
    [highId, lowId]
  );
  // 5*10 + 0 testigos + 5 complejidad = 55 y 1*10 + 5 = 15
  assert.deepEqual(detail.body.alibis.map((alibi) => alibi.credibilityIndex), [55, 15]);
  assert.equal(detail.body.alibis[0].creatorAlias, "fabio");

  const request = await api(`/api/situations/${situationId}/requests`, {
    method: "POST",
    token: tokens.carla,
    body: { message: "Necesito una coartada creíble" },
  });
  assert.equal(request.status, 201);

  const repeated = await api(`/api/situations/${situationId}/requests`, {
    method: "POST",
    token: tokens.carla,
    body: {},
  });
  assert.equal(repeated.status, 409);
});
