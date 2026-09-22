import assert from "node:assert/strict";
import { after, before, beforeEach, test } from "node:test";
import { MongoMemoryServer } from "mongodb-memory-server";
import { createApp } from "../src/app.js";
import { connectDB, disconnectDB } from "../src/config/db.js";
import { ExposureReport } from "../src/models/ExposureReport.js";
import { Situation } from "../src/models/Situation.js";
import { Vote } from "../src/models/Vote.js";
import {
  recalculateAlibi,
  updateWitnessCountAndRecalculate,
} from "../src/services/credibility.js";

let mongoServer;
let httpServer;
let apiUrl;

function alibi(externalId, creatorId = "creator-1", alias = "Alias 1") {
  return {
    externalId,
    title: `Coartada ${externalId}`,
    story: "Una historia suficientemente clara para realizar las pruebas.",
    creatorId,
    creatorAlias: alias,
    witnessCount: 0,
  };
}

before(async () => {
  const mongoOptions =
    process.platform === "linux"
      ? {
          instance: {
            args: ["--nounixsocket"],
          },
        }
      : {};

  mongoServer = await MongoMemoryServer.create(mongoOptions);

  await connectDB(mongoServer.getUri());;
  await Promise.all([
    Vote.syncIndexes(),
    Situation.syncIndexes(),
    ExposureReport.syncIndexes(),
  ]);

  httpServer = createApp().listen(0);
  apiUrl = `http://127.0.0.1:${httpServer.address().port}/api`;
});

after(async () => {
  if (httpServer) {
    httpServer.close();
  }
  await disconnectDB();
  if (mongoServer) {
    await mongoServer.stop();
  }
});

beforeEach(async () => {
  await Promise.all([
    Vote.deleteMany({}),
    Situation.deleteMany({}),
    ExposureReport.deleteMany({}),
  ]);
  await Situation.create({
    title: "Situación inicial",
    description: "Situación utilizada para las pruebas.",
    alibis: [
      alibi("alibi-1", "creator-1", "El Fantasma"),
      alibi("alibi-2", "creator-2", "Mente Maestra"),
      alibi("alibi-3", "creator-1", "El Fantasma"),
    ],
  });
});

async function request(path, options = {}) {
  const response = await fetch(`${apiUrl}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...options.headers },
  });

  return { response, body: await response.json() };
}

test("responde el estado del backend de Persona B", async () => {
  const result = await request("/health");
  assert.equal(result.response.status, 200);
  assert.equal(result.body.service, "alibiforge-persona-b");
});

test("crea, lista, busca y consulta situaciones", async () => {
  const created = await request("/situations", {
    method: "POST",
    body: JSON.stringify({
      title: "Llegada tarde",
      description: "Nueva situación comunitaria.",
    }),
  });
  assert.equal(created.response.status, 201);

  const list = await request("/situations?search=llegada");
  assert.equal(list.body.length, 1);

  const detail = await request(`/situations/${created.body.situation._id}`);
  assert.equal(detail.response.status, 200);
  assert.equal(detail.body.title, "Llegada tarde");
});

test("registra y consulta votos", async () => {
  const created = await request("/alibis/alibi-1/votes", {
    method: "POST",
    body: JSON.stringify({
      voterId: "voter-1",
      credibility: 5,
      creativity: 4,
      consistency: 5,
    }),
  });
  assert.equal(created.response.status, 201);
  assert.equal(created.body.credibilityIndex, 4.67);

  const list = await request("/alibis/alibi-1/votes");
  assert.equal(list.body.votes.length, 1);
});

test("evita votos duplicados y calificaciones inválidas", async () => {
  const payload = {
    voterId: "voter-1",
    credibility: 5,
    creativity: 4,
    consistency: 5,
  };
  await request("/alibis/alibi-1/votes", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  const duplicate = await request("/alibis/alibi-1/votes", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  assert.equal(duplicate.response.status, 409);

  const invalid = await request("/alibis/alibi-2/votes", {
    method: "POST",
    body: JSON.stringify({ ...payload, credibility: 8 }),
  });
  assert.equal(invalid.response.status, 400);
});

test("expone y penaliza la coartada con tres reportes", async () => {
  for (const reporterId of ["reporter-1", "reporter-2", "reporter-3"]) {
    await request("/alibis/alibi-1/report", {
      method: "POST",
      body: JSON.stringify({ reporterId }),
    });
  }

  const situation = await Situation.findOne({ "alibis.externalId": "alibi-1" });
  const reportedAlibi = situation.alibis.find(
    (item) => item.externalId === "alibi-1"
  );
  assert.equal(reportedAlibi.exposed, true);
  assert.equal(reportedAlibi.credibilityIndex, 0);
  assert.equal(reportedAlibi.penaltyPoints, -10);
  assert.equal(reportedAlibi.penaltyApplied, true);
});

test("recalcula después de votar o cambiar testigos", async () => {
  await Vote.create({
    alibiId: "alibi-2",
    voterId: "voter-1",
    credibility: 4,
    creativity: 4,
    consistency: 4,
  });
  const beforeValue = await recalculateAlibi("alibi-2");
  const afterValue = await updateWitnessCountAndRecalculate("alibi-2", 2);
  assert.equal(beforeValue, 4);
  assert.equal(afterValue, 4.2);
});

test("entrega los cuatro rankings", async () => {
  await Vote.create([
    {
      alibiId: "alibi-1",
      voterId: "voter-1",
      credibility: 5,
      creativity: 4,
      consistency: 3,
    },
    {
      alibiId: "alibi-2",
      voterId: "voter-2",
      credibility: 3,
      creativity: 5,
      consistency: 4,
    },
  ]);

  const rankingTypes = [
    "master-of-deceit",
    "most-creative",
    "most-consistent",
    "most-wanted",
  ];

  for (const rankingType of rankingTypes) {
    const result = await request(`/rankings/${rankingType}`);
    assert.equal(result.response.status, 200);
    assert.equal(result.body.length, 2);
  }
});
