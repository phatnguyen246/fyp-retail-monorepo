import { createCatalogAdapters } from "../adapters/index.js";
import { createCatalogModels } from "../models/index.js";
import { createCatalogValidation } from "../validation/index.js";
import { createCatalogHealthPayload } from "../utils/index.js";

export function createCatalogServices({
    adapters = createCatalogAdapters(),
    models = createCatalogModels(),
    validation = createCatalogValidation(),
} = {}) {
    void adapters;
    void models;
    void validation;

    return {
        getHealth() {
            return createCatalogHealthPayload();
        },
    };
}
