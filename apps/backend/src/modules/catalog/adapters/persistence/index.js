import { createCatalogBaseRepository } from "./catalog-base.repository.js";

export function createCatalogPersistence({ db } = {}) {
    return {
        baseRepository: createCatalogBaseRepository({ db }),
    };
}
