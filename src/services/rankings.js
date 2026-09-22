import { Situation } from "../models/Situation.js";
import { Vote } from "../models/Vote.js";

function sortRanking(ranking) {
  return ranking.sort(
    (first, second) =>
      second.score - first.score || first.alias.localeCompare(second.alias)
  );
}

async function communityData() {
  const situations = await Situation.find({}).lean();
  return situations.flatMap((situation) => situation.alibis || []);
}

async function rankingByRating(field) {
  const [alibis, votes] = await Promise.all([
    communityData(),
    Vote.find({}).lean(),
  ]);
  const creators = new Map();

  alibis.forEach((alibi) => {
    if (!creators.has(alibi.creatorId)) {
      creators.set(alibi.creatorId, {
        id: alibi.creatorId,
        alias: alibi.creatorAlias,
        values: [],
      });
    }

    votes
      .filter((vote) => vote.alibiId === alibi.externalId)
      .forEach((vote) => creators.get(alibi.creatorId).values.push(vote[field]));
  });

  return sortRanking(
    [...creators.values()].map((creator) => ({
      id: creator.id,
      alias: creator.alias,
      score:
        creator.values.length === 0
          ? 0
          : Math.round(
              (creator.values.reduce((sum, value) => sum + value, 0) /
                creator.values.length) *
                100
            ) / 100,
    }))
  );
}

async function mostWantedRanking() {
  const creators = new Map();

  (await communityData()).forEach((alibi) => {
    const current = creators.get(alibi.creatorId) || {
      id: alibi.creatorId,
      alias: alibi.creatorAlias,
      score: 0,
    };
    current.score += 1;
    creators.set(alibi.creatorId, current);
  });

  return sortRanking([...creators.values()]);
}

export async function getRanking(type) {
  const fields = {
    "master-of-deceit": "credibility",
    "most-creative": "creativity",
    "most-consistent": "consistency",
  };

  if (fields[type]) {
    return rankingByRating(fields[type]);
  }

  if (type === "most-wanted") {
    return mostWantedRanking();
  }

  return null;
}
