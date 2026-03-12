import { createCatalogAdapters } from "../adapters/index.js";
import { createCatalogValidation } from "../validation/index.js";
import { createCatalogHealthPayload } from "../utils/index.js";
import { createCreateProductService } from "./create-product.service.js";
import { createCreateVariantService } from "./create-variant.service.js";
import { createGetProductDetailAdminService } from "./get-product-detail-admin.service.js";
import { createRebuildProductDerivedFieldsService } from "./rebuild-product-derived-fields.service.js";
import { createSoftDeleteProductService } from "./soft-delete-product.service.js";
import { createSoftDeleteVariantService } from "./soft-delete-variant.service.js";
import { createUpdateProductService } from "./update-product.service.js";
import { createUpdateVariantService } from "./update-variant.service.js";

export { createCreateProductService } from "./create-product.service.js";
export { createCreateVariantService } from "./create-variant.service.js";
export { createGetProductDetailAdminService } from "./get-product-detail-admin.service.js";
export { createRebuildProductDerivedFieldsService } from "./rebuild-product-derived-fields.service.js";
export { createSoftDeleteProductService } from "./soft-delete-product.service.js";
export { createSoftDeleteVariantService } from "./soft-delete-variant.service.js";
export { createUpdateProductService } from "./update-product.service.js";
export { createUpdateVariantService } from "./update-variant.service.js";

export function createCatalogServices({
    adapters = createCatalogAdapters(),
    validation = createCatalogValidation(),
} = {}) {
    const productRepository = adapters?.persistence?.productRepository;
    const referenceRepository = adapters?.persistence?.referenceRepository;
    const variantRepository = adapters?.persistence?.variantRepository;
    const rebuildProductDerivedFields = createRebuildProductDerivedFieldsService({
        productRepository,
        variantRepository,
    });

    return {
        getHealth() {
            return createCatalogHealthPayload();
        },
        rebuildProductDerivedFields,
        createProduct: createCreateProductService({
            productRepository,
            referenceRepository,
            validation,
        }),
        updateProduct: createUpdateProductService({
            productRepository,
            referenceRepository,
            validation,
            rebuildProductDerivedFields,
        }),
        getProductDetailAdmin: createGetProductDetailAdminService({
            productRepository,
            variantRepository,
            validation,
        }),
        softDeleteProduct: createSoftDeleteProductService({
            productRepository,
            variantRepository,
            validation,
            rebuildProductDerivedFields,
        }),
        createVariant: createCreateVariantService({
            productRepository,
            variantRepository,
            validation,
            rebuildProductDerivedFields,
        }),
        updateVariant: createUpdateVariantService({
            productRepository,
            variantRepository,
            validation,
            rebuildProductDerivedFields,
        }),
        softDeleteVariant: createSoftDeleteVariantService({
            variantRepository,
            validation,
            rebuildProductDerivedFields,
        }),
    };
}
