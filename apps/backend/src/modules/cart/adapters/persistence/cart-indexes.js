import { CART_COLLECTIONS } from "../../constants/index.js";
import { createCartBaseRepository } from "./cart-base.repository.js";

const UNIQUE_INDEX_DEFINITIONS = [
    {
        collectionName: CART_COLLECTIONS.carts,
        key: { ownerType: 1, ownerKey: 1 },
        indexName: "carts_owner_type_owner_key_unique",
    },
];

export async function ensureCartIndexes({
    db,
    repository = createCartBaseRepository({ db }),
} = {}) {
    for (const definition of UNIQUE_INDEX_DEFINITIONS) {
        await repository.ensureUniqueIndex(definition);
    }
}
