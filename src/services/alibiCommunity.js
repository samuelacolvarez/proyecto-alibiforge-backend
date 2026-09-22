import { Situation } from "../models/Situation.js";

export async function findCommunityAlibi(alibiId) {
  const situation = await Situation.findOne({
    "alibis.externalId": String(alibiId),
  });

  if (!situation) {
    return null;
  }

  const alibi = situation.alibis.find(
    (item) => item.externalId === String(alibiId)
  );

  return alibi ? { situation, alibi } : null;
}

export async function updateCommunityAlibi(alibiId, fields) {
  return Situation.updateOne(
    { "alibis.externalId": String(alibiId) },
    {
      $set: Object.fromEntries(
        Object.entries(fields).map(([key, value]) => [
          `alibis.$[alibi].${key}`,
          value,
        ])
      ),
    },
    { arrayFilters: [{ "alibi.externalId": String(alibiId) }] }
  );
}
