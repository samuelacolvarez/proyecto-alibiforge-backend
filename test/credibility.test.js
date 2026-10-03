import assert from "node:assert/strict";
import { test } from "node:test";
import {
  calculateAverageScore,
  calculateComplexityScore,
  calculateCredibilityIndex,
} from "../src/services/credibilityFormula.js";
import { buildRanking } from "../src/services/rankings.js";

// Tests sin base de datos: validan las fórmulas del enunciado (req. 8, 9, 10, 15, 17, 18).

test("complejidad: 3+ detalles = 5, 5+ = 10, 10+ = 20 (req. 10)", () => {
  assert.equal(calculateComplexityScore(2), 0);
  assert.equal(calculateComplexityScore(3), 5);
  assert.equal(calculateComplexityScore(4), 5);
  assert.equal(calculateComplexityScore(5), 10);
  assert.equal(calculateComplexityScore(9), 10);
  assert.equal(calculateComplexityScore(10), 20);
});

test("promedio = (credibilidad + creatividad + consistencia) / 3 (req. 8)", () => {
  assert.equal(calculateAverageScore([]), 0);
  assert.equal(
    calculateAverageScore([{ credibility: 5, creativity: 4, consistency: 3 }]),
    4
  );
  assert.equal(
    calculateAverageScore([
      { credibility: 5, creativity: 5, consistency: 5 },
      { credibility: 3, creativity: 3, consistency: 3 },
    ]),
    4
  );
});

test("Credibility Index = (promedio * 10) + (testigos * 2) + complejidad (req. 9 y 15)", () => {
  // 4 * 10 + 3 * 2 + 10 = 56
  assert.equal(
    calculateCredibilityIndex({ averageScore: 4, witnessCount: 3, complexityScore: 10 }),
    56
  );
  // Sin votos: solo cuentan testigos y complejidad
  assert.equal(
    calculateCredibilityIndex({ averageScore: 0, witnessCount: 2, complexityScore: 5 }),
    9
  );
  // Cada testigo suma exactamente 2
  const base = calculateCredibilityIndex({ averageScore: 3.5, witnessCount: 0, complexityScore: 5 });
  const withWitness = calculateCredibilityIndex({ averageScore: 3.5, witnessCount: 1, complexityScore: 5 });
  assert.equal(withWitness - base, 2);
});

test("una coartada expuesta siempre tiene índice 0 (req. 18)", () => {
  assert.equal(
    calculateCredibilityIndex({
      averageScore: 5,
      witnessCount: 5,
      complexityScore: 20,
      exposed: true,
    }),
    0
  );
});

test("rankings: promedios por creador, orden y alias reales (req. 17)", () => {
  const users = [
    { _id: "u1", alias: "Ana" },
    { _id: "u2", alias: "Beto" },
  ];
  const alibis = [
    { _id: "a1", owner: "u1" },
    { _id: "a2", owner: "u1" },
    { _id: "a3", owner: "u2" },
  ];
  const votes = [
    { alibiId: "a1", credibility: 5, creativity: 2, consistency: 4 },
    { alibiId: "a2", credibility: 3, creativity: 2, consistency: 4 },
    { alibiId: "a3", credibility: 4, creativity: 5, consistency: 1 },
  ];

  const deceit = buildRanking("master-of-deceit", { alibis, votes, users });
  assert.deepEqual(deceit.map((row) => [row.alias, row.score]), [
    ["Ana", 4],
    ["Beto", 4],
  ]);

  const creative = buildRanking("most-creative", { alibis, votes, users });
  assert.deepEqual(creative.map((row) => [row.alias, row.score]), [
    ["Beto", 5],
    ["Ana", 2],
  ]);

  const consistent = buildRanking("most-consistent", { alibis, votes, users });
  assert.equal(consistent[0].alias, "Ana");
  assert.equal(consistent[0].score, 4);

  const wanted = buildRanking("most-wanted", { alibis, votes, users });
  assert.deepEqual(wanted.map((row) => [row.alias, row.score]), [
    ["Ana", 2],
    ["Beto", 1],
  ]);

  assert.equal(buildRanking("no-existe", { alibis, votes, users }), null);
});
