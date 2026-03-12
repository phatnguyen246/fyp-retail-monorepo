import { createCatalogAdapters } from "../adapters/index.js";
import { createCatalogValidation } from "../validation/index.js";
import { createCatalogHealthPayload } from "../utils/index.js";

export function createCatalogServices({
    adapters = createCatalogAdapters(),
    validation = createCatalogValidation(),
} = {}) {
    void adapters;
    void validation;

    return {
        getHealth() {
            return createCatalogHealthPayload();
        },
    };
}
