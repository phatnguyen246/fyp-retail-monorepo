import {
    BRAND_DOCUMENT_SHAPE,
    BRAND_STATUSES,
    createBrand,
} from "./brand.model.js";
import {
    CATEGORY_DOCUMENT_SHAPE,
    CATEGORY_STATUSES,
    createCategory,
} from "./category.model.js";
import {
    PRODUCT_BADGE_CODES,
    PRODUCT_DOCUMENT_SHAPE,
    PRODUCT_LISTING_VARIANT_SNAPSHOT_SHAPE,
    PRODUCT_STATUSES,
    PRODUCT_TYPES,
    PRODUCT_YOUTUBE_VIDEO_SHAPE,
    createProductYoutubeVideo,
    SMARTPHONE_SPECS_SHAPE,
    createProduct,
    createSmartphoneSpecs,
} from "./product.model.js";
import {
    createProductMediaMetadata,
    getAllowedProductMediaMimeTypes,
    PRODUCT_MEDIA_BINARY_FIELDS,
    PRODUCT_MEDIA_METADATA_SHAPE,
} from "./product-media.model.js";
import { TAG_DOCUMENT_SHAPE, TAG_STATUSES, createTag } from "./tag.model.js";
import {
    VARIANT_ATTRIBUTES_SHAPE,
    VARIANT_DOCUMENT_SHAPE,
    VARIANT_STATUSES,
    VARIANT_VIDEO_SHAPE,
    createVariant,
    createVariantAttributes,
    createVariantVideo,
} from "./variant.model.js";

export {
    BRAND_DOCUMENT_SHAPE,
    BRAND_STATUSES,
    createBrand,
} from "./brand.model.js";
export {
    CATEGORY_DOCUMENT_SHAPE,
    CATEGORY_STATUSES,
    createCategory,
} from "./category.model.js";
export {
    PRODUCT_BADGE_CODES,
    PRODUCT_DOCUMENT_SHAPE,
    PRODUCT_LISTING_VARIANT_SNAPSHOT_SHAPE,
    PRODUCT_STATUSES,
    PRODUCT_TYPES,
    PRODUCT_YOUTUBE_VIDEO_SHAPE,
    createProductYoutubeVideo,
    SMARTPHONE_SPECS_SHAPE,
    createProduct,
    createSmartphoneSpecs,
} from "./product.model.js";
export {
    createProductMediaMetadata,
    getAllowedProductMediaMimeTypes,
    PRODUCT_MEDIA_BINARY_FIELDS,
    PRODUCT_MEDIA_METADATA_SHAPE,
} from "./product-media.model.js";
export { TAG_DOCUMENT_SHAPE, TAG_STATUSES, createTag } from "./tag.model.js";
export {
    VARIANT_ATTRIBUTES_SHAPE,
    VARIANT_DOCUMENT_SHAPE,
    VARIANT_STATUSES,
    VARIANT_VIDEO_SHAPE,
    createVariant,
    createVariantAttributes,
    createVariantVideo,
} from "./variant.model.js";

export function createCatalogModels() {
    return {
        Brand: BRAND_DOCUMENT_SHAPE,
        Product: PRODUCT_DOCUMENT_SHAPE,
        ProductMediaMetadata: PRODUCT_MEDIA_METADATA_SHAPE,
        Category: CATEGORY_DOCUMENT_SHAPE,
        Tag: TAG_DOCUMENT_SHAPE,
        Variant: VARIANT_DOCUMENT_SHAPE,
        smartphoneSpecsShape: SMARTPHONE_SPECS_SHAPE,
        productListingVariantSnapshotShape:
            PRODUCT_LISTING_VARIANT_SNAPSHOT_SHAPE,
        productYoutubeVideoShape: PRODUCT_YOUTUBE_VIDEO_SHAPE,
        variantAttributesShape: VARIANT_ATTRIBUTES_SHAPE,
        variantVideoShape: VARIANT_VIDEO_SHAPE,
        brandStatuses: BRAND_STATUSES,
        categoryStatuses: CATEGORY_STATUSES,
        productStatuses: PRODUCT_STATUSES,
        productTypes: PRODUCT_TYPES,
        productBadgeCodes: PRODUCT_BADGE_CODES,
        tagStatuses: TAG_STATUSES,
        variantStatuses: VARIANT_STATUSES,
        createBrand,
        createCategory,
        createProduct,
        createProductYoutubeVideo,
        createProductMediaMetadata,
        createSmartphoneSpecs,
        createTag,
        createVariant,
        createVariantAttributes,
        createVariantVideo,
        getAllowedProductMediaMimeTypes,
        productMediaBinaryFields: PRODUCT_MEDIA_BINARY_FIELDS,
    };
}
