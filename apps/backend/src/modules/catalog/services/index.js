import { createCatalogAdapters } from "../adapters/index.js";
import { createCatalogValidation } from "../validation/index.js";
import { createCatalogHealthPayload } from "../utils/index.js";
import { createRebuildProductDerivedFieldsService } from "./rebuild-product-derived-fields.service.js";

export function createCatalogServices({
    adapters = createCatalogAdapters(),
    validation = createCatalogValidation(),
} = {}) {
    void validation;

    const productRepository = adapters?.persistence?.productRepository;
    const variantRepository = adapters?.persistence?.variantRepository;

    return {
        getHealth() {
            return createCatalogHealthPayload();
        },
        rebuildProductDerivedFields: createRebuildProductDerivedFieldsService({
            productRepository,
            variantRepository,
        }),
    };
}
