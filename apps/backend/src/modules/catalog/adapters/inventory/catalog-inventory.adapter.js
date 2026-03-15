import { createInventoryPersistence } from "../../../inventory/adapters/persistence/index.js";
import {
    createReadInventoryByVariantIdService,
    createReadInventoryByVariantIdsService,
} from "../../../inventory/services/read-inventory.service.js";

export function createCatalogInventoryAdapter({
    db,
    inventoryPersistence = createInventoryPersistence({ db }),
    readInventoryByVariantId = createReadInventoryByVariantIdService({
        inventoryRepository: inventoryPersistence?.inventoryRepository,
    }),
    readInventoryByVariantIds = createReadInventoryByVariantIdsService({
        inventoryRepository: inventoryPersistence?.inventoryRepository,
    }),
} = {}) {
    return {
        readInventoryByVariantId,
        readInventoryByVariantIds,
    };
}
