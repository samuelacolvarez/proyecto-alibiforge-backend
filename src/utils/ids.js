// Devuelve el id (string) de un valor que puede ser:
//  - un ObjectId sin popular,
//  - un documento populado (que Mongoose ya serializó con `id`, sin `_id`),
//  - un string.
// Evita el bug clásico de terminar con "[object Object]".
export function idOf(value) {
  if (value === null || value === undefined) return undefined;
  if (value._bsontype === "ObjectId") return value.toString();
  const nested = value.id ?? value._id;
  return nested !== undefined ? String(nested) : String(value);
}
