import { createCartCatalogAdapter } from "./catalog/index.js";
import { createCartInventoryAdapter } from "./inventory/index.js";
import { createCartPersistence } from "./persistence/index.js";

export function createCartAdapters({ db } = {}) {
    return {
        catalog: createCartCatalogAdapter({ db }),
        inventory: createCartInventoryAdapter({ db }),
        persistence: createCartPersistence({ db }),
    };
}
