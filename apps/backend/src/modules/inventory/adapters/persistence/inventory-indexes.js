import { INVENTORY_COLLECTIONS } from "../../constants/index.js";
import { createInventoryBaseRepository } from "./inventory-base.repository.js";

const UNIQUE_INDEX_DEFINITIONS = [
    {
        collectionName: INVENTORY_COLLECTIONS.inventoryRecords,
        key: { variantId: 1 },
        indexName: "inventory_records_variant_id_unique",
    },
];

const NON_UNIQUE_INDEX_DEFINITIONS = [
    {
        collectionName: INVENTORY_COLLECTIONS.inventoryRecords,
        key: { stockQuantity: 1 },
        indexName: "inventory_records_stock_quantity",
    },
];

export async function ensureInventoryIndexes({
    db,
    repository = createInventoryBaseRepository({ db }),
} = {}) {
    for (const definition of UNIQUE_INDEX_DEFINITIONS) {
        await repository.ensureUniqueIndex(definition);
    }

    for (const definition of NON_UNIQUE_INDEX_DEFINITIONS) {
        await repository.ensureIndex(definition);
    }
}
