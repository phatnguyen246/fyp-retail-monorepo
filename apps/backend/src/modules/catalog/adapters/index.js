import { createCatalogInventoryAdapter } from "./inventory/index.js";
import { createCatalogPersistence } from "./persistence/index.js";
import { createVariantMediaStorage } from "./storage/variant-media.storage.js";

export { createVariantMediaStorage } from "./storage/variant-media.storage.js";

export function createCatalogAdapters({ db, storage } = {}) {
    const adapters = {
        inventory: createCatalogInventoryAdapter({ db }),
        persistence: createCatalogPersistence({ db }),
    };

    if (storage?.bucket) {
        adapters.storage = createVariantMediaStorage({
            bucket: storage.bucket,
        });
    }

    return adapters;
}
