import { Alibi } from "../models/Alibi.js";
import { User } from "../models/User.js";
import { Vote } from "../models/Vote.js";
import { round2 } from "./credibilityFormula.js";

// Req. 17: tipo de ranking -> campo de la votación que promedia.
const RATING_FIELDS = {
  "master-of-deceit": "credibility",
  "most-creative": "creativity",
  "most-consistent": "consistency",
};

export const RANKING_TYPES = [...Object.keys(RATING_FIELDS), "most-wanted"];

function sortRanking(rows) {
  return rows.sort(
    (first, second) =>
      second.score - first.score || first.alias.localeCompare(second.alias)
  );
}

// Función pura (sin base de datos): arma el ranking a partir de datos ya cargados.
//  alibis: [{ _id, owner }]   votes: [{ alibiId, credibility, creativity, consistency }]
//  users:  [{ _id, alias }]
export function buildRanking(type, { alibis, votes, users }) {
  const aliasById = new Map(users.map((user) => [String(user._id), user.alias]));
  const ownerByAlibi = new Map(alibis.map((a) => [String(a._id), String(a.owner)]));
  const rows = new Map();

  const rowFor = (ownerId) => {
    if (!rows.has(ownerId)) {
      rows.set(ownerId, {
        id: ownerId,
        alias: aliasById.get(ownerId) ?? "Desconocido",
        sum: 0,
        count: 0,
      });
    }
    return rows.get(ownerId);
  };

  if (type === "most-wanted") {
    for (const alibi of alibis) rowFor(String(alibi.owner)).count += 1;
    return sortRanking(
      [...rows.values()].map(({ id, alias, count }) => ({ id, alias, score: count }))
    );
  }

  const field = RATING_FIELDS[type];
  if (!field) return null;

  // Solo aparecen creadores que ya recibieron al menos un voto.
  for (const vote of votes) {
    const ownerId = ownerByAlibi.get(String(vote.alibiId));
    if (!ownerId) continue;
    const row = rowFor(ownerId);
    row.sum += vote[field];
    row.count += 1;
  }

  return sortRanking(
    [...rows.values()].map(({ id, alias, sum, count }) => ({
      id,
      alias,
      score: round2(sum / count),
    }))
  );
}

export async function getRanking(type) {
  if (!RANKING_TYPES.includes(type)) return null;

  const [alibis, votes] = await Promise.all([
    Alibi.find({}).select("owner").lean(),
    type === "most-wanted" ? [] : Vote.find({}).lean(),
  ]);
  const ownerIds = [...new Set(alibis.map((a) => String(a.owner)))];
  const users = await User.find({ _id: { $in: ownerIds } }).select("alias").lean();

  return buildRanking(type, { alibis, votes, users });
}
