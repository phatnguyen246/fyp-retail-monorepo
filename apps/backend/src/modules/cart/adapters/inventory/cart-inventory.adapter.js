import { createInventoryPersistence } from "../../../inventory/adapters/persistence/index.js";
import { createReadInventoryByVariantIdsService } from "../../../inventory/services/read-inventory.service.js";

export function createCartInventoryAdapter({
    db,
    inventoryPersistence = createInventoryPersistence({ db }),
    readInventoryByVariantIds = createReadInventoryByVariantIdsService({
        inventoryRepository: inventoryPersistence?.inventoryRepository,
    }),
} = {}) {
    return {
        readInventoryByVariantIds,
    };
}
