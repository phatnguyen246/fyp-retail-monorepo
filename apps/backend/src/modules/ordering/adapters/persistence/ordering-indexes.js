import { ORDER_COLLECTIONS } from "../../constants/index.js";
import { createOrderingBaseRepository } from "./ordering-base.repository.js";

const UNIQUE_INDEX_DEFINITIONS = [
    {
        collectionName: ORDER_COLLECTIONS.orders,
        key: { orderCode: 1 },
        indexName: "orders_order_code_unique",
    },
];

const NON_UNIQUE_INDEX_DEFINITIONS = [
    {
        collectionName: ORDER_COLLECTIONS.orders,
        key: { createdAt: -1 },
        indexName: "orders_created_at_desc",
    },
    {
        collectionName: ORDER_COLLECTIONS.orders,
        key: { accountId: 1, createdAt: -1 },
        indexName: "orders_account_id_created_at_desc",
    },
];

export async function ensureOrderingIndexes({
    db,
    repository = createOrderingBaseRepository({ db }),
} = {}) {
    for (const definition of UNIQUE_INDEX_DEFINITIONS) {
        await repository.ensureUniqueIndex(definition);
    }

    for (const definition of NON_UNIQUE_INDEX_DEFINITIONS) {
        await repository.ensureIndex(definition);
    }
}
