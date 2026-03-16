import { createCartInternalAdapters } from "./internal/index.js";
import { createCartCatalogAdapter } from "./catalog/index.js";
import { createCartInventoryAdapter } from "./inventory/index.js";
import { createCartPersistence } from "./persistence/index.js";

export function createCartAdapters({ db } = {}) {
    const persistence = createCartPersistence({ db });

    return {
        catalog: createCartCatalogAdapter({ db }),
        inventory: createCartInventoryAdapter({ db }),
        persistence,
        internal: createCartInternalAdapters({
            cartRepository: persistence?.cartRepository,
        }),
    };
}
