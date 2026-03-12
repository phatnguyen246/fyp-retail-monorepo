import {
    createProductMediaMetadata,
    getAllowedProductMediaMimeTypes,
    PRODUCT_MEDIA_BINARY_FIELDS,
    PRODUCT_MEDIA_METADATA_SHAPE,
} from "./product-media.model.js";

export {
    createProductMediaMetadata,
    getAllowedProductMediaMimeTypes,
    PRODUCT_MEDIA_BINARY_FIELDS,
    PRODUCT_MEDIA_METADATA_SHAPE,
} from "./product-media.model.js";

export function createCatalogModels() {
    return {
        Product: null,
        ProductMediaMetadata: PRODUCT_MEDIA_METADATA_SHAPE,
        createProductMediaMetadata,
        getAllowedProductMediaMimeTypes,
        productMediaBinaryFields: PRODUCT_MEDIA_BINARY_FIELDS,
    };
}
