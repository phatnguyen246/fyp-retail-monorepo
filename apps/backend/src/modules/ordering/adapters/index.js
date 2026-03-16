import { createOrderingCartAdapter } from "./cart/index.js";
import { createOrderingCatalogAdapter } from "./catalog/index.js";
import { createOrderingInventoryAdapter } from "./inventory/index.js";
import { createOrderingPersistence } from "./persistence/index.js";

export function createOrderingAdapters({ db, cartOrderReader } = {}) {
    const persistence = createOrderingPersistence({ db });

    return {
        cart: createOrderingCartAdapter({
            orderReader: cartOrderReader,
        }),
        catalog: createOrderingCatalogAdapter({ db }),
        inventory: createOrderingInventoryAdapter({ db }),
        persistence,
    };
}
