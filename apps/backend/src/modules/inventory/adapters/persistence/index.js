import { createInventoryBaseRepository } from "./inventory-base.repository.js";
import { ensureInventoryIndexes } from "./inventory-indexes.js";
import { createInventoryRepository } from "./inventory.repository.js";

export { createInventoryBaseRepository } from "./inventory-base.repository.js";
export { ensureInventoryIndexes } from "./inventory-indexes.js";
export { createInventoryRepository } from "./inventory.repository.js";

export function createInventoryPersistence({ db } = {}) {
    return {
        inventoryRepository: createInventoryRepository({ db }),
    };
}
