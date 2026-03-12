import { createCatalogPersistence } from "./persistence/index.js";

export function createCatalogAdapters({ db } = {}) {
    return {
        persistence: createCatalogPersistence({ db }),
    };
}
