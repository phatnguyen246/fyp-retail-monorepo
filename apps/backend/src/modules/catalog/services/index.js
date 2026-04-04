import { createCatalogAdapters } from "../adapters/index.js";
import { createCatalogValidation } from "../validation/index.js";
import { createCatalogHealthPayload } from "../utils/index.js";
import { createCreateProductService } from "./create-product.service.js";
import { createCreateVariantService } from "./create-variant.service.js";
import { createDeleteVariantImageService } from "./delete-variant-image.service.js";
import { createCloneProductService } from "./clone-product.service.js";
import { createCompareProductsService } from "./compare-products.service.js";
import { createGetProductDetailAdminService } from "./get-product-detail-admin.service.js";
import { createGetProductDiscoveryOptionsService } from "./get-product-discovery-options.service.js";
import { createGetProductDetailStorefrontService } from "./get-product-detail-storefront.service.js";
import { createImportProductsService } from "./import-products.service.js";
import { createListAdminProductsService } from "./list-admin-products.service.js";
import { createListProductsService } from "./list-products.service.js";
import { createListVariantImagesService } from "./list-variant-images.service.js";
import { createRebuildProductDerivedFieldsService } from "./rebuild-product-derived-fields.service.js";
import { createSearchProductsService } from "./search-products.service.js";
import { createSoftDeleteProductService } from "./soft-delete-product.service.js";
import { createSoftDeleteVariantService } from "./soft-delete-variant.service.js";
import { createUploadVariantImageService } from "./upload-variant-image.service.js";
import { createUpdateProductService } from "./update-product.service.js";
import { createUpdateVariantService } from "./update-variant.service.js";

export { createCreateProductService } from "./create-product.service.js";
export { createCreateVariantService } from "./create-variant.service.js";
export { createDeleteVariantImageService } from "./delete-variant-image.service.js";
export { createCloneProductService } from "./clone-product.service.js";
export { createCompareProductsService } from "./compare-products.service.js";
export { createGetProductDetailAdminService } from "./get-product-detail-admin.service.js";
export { createGetProductDiscoveryOptionsService } from "./get-product-discovery-options.service.js";
export { createGetProductDetailStorefrontService } from "./get-product-detail-storefront.service.js";
export { createImportProductsService } from "./import-products.service.js";
export { createListAdminProductsService } from "./list-admin-products.service.js";
export { createListProductsService } from "./list-products.service.js";
export { createListVariantImagesService } from "./list-variant-images.service.js";
export { createRebuildProductDerivedFieldsService } from "./rebuild-product-derived-fields.service.js";
export { createSearchProductsService } from "./search-products.service.js";
export { createSoftDeleteProductService } from "./soft-delete-product.service.js";
export { createSoftDeleteVariantService } from "./soft-delete-variant.service.js";
export { createUploadVariantImageService } from "./upload-variant-image.service.js";
export { createUpdateProductService } from "./update-product.service.js";
export { createUpdateVariantService } from "./update-variant.service.js";

export function createCatalogServices({
    adapters = createCatalogAdapters(),
    validation = createCatalogValidation(),
    logger = console,
} = {}) {
    const inventoryAdapter = adapters?.inventory;
    const productRepository = adapters?.persistence?.productRepository;
    const referenceRepository = adapters?.persistence?.referenceRepository;
    const mediaRepository = adapters?.persistence?.mediaRepository;
    const storage = adapters?.storage;
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
        getProductDiscoveryOptions: createGetProductDiscoveryOptionsService({
            productRepository,
            referenceRepository,
            validation,
            variantRepository,
        }),
        listProducts: createListProductsService({
            inventoryAdapter,
            mediaRepository,
            productRepository,
            referenceRepository,
            variantRepository,
            validation,
            logger,
        }),
        searchProducts: createSearchProductsService({
            inventoryAdapter,
            mediaRepository,
            productRepository,
            referenceRepository,
            variantRepository,
            validation,
            logger,
        }),
        getProductDetailStorefront: createGetProductDetailStorefrontService({
            inventoryAdapter,
            productRepository,
            referenceRepository,
            variantRepository,
            mediaRepository,
            validation,
            logger,
        }),
        compareProducts: createCompareProductsService({
            inventoryAdapter,
            productRepository,
            referenceRepository,
            variantRepository,
            validation,
            logger,
        }),
        listAdminProducts: createListAdminProductsService({
            productRepository,
            referenceRepository,
            validation,
        }),
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
            referenceRepository,
            variantRepository,
            validation,
        }),
        importProducts: createImportProductsService({
            productRepository,
            referenceRepository,
            variantRepository,
            validation,
            rebuildProductDerivedFields,
        }),
        cloneProduct: createCloneProductService({
            productRepository,
            validation,
        }),
        softDeleteProduct: createSoftDeleteProductService({
            productRepository,
            referenceRepository,
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
        uploadVariantImage: createUploadVariantImageService({
            productRepository,
            variantRepository,
            mediaRepository,
            storage,
            validation,
        }),
        listVariantImages: createListVariantImagesService({
            variantRepository,
            mediaRepository,
            validation,
        }),
        deleteVariantImage: createDeleteVariantImageService({
            productRepository,
            variantRepository,
            mediaRepository,
            storage,
            validation,
        }),
    };
}
