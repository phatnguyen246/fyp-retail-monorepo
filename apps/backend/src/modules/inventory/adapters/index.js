import { createInventoryCatalogAdapter } from "./catalog/index.js";
import { createInventoryPersistence } from "./persistence/index.js";

export function createInventoryAdapters({ db } = {}) {
    return {
        catalog: createInventoryCatalogAdapter({ db }),
        persistence: createInventoryPersistence({ db }),
    };
}
