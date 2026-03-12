import { CATALOG_COLLECTIONS } from "../../constants/index.js";
import { createCatalogBaseRepository } from "./catalog-base.repository.js";

const UNIQUE_INDEX_DEFINITIONS = [
    {
        collectionName: CATALOG_COLLECTIONS.brands,
        key: { code: 1 },
        indexName: "brands_code_unique",
    },
    {
        collectionName: CATALOG_COLLECTIONS.categories,
        key: { code: 1 },
        indexName: "categories_code_unique",
    },
    {
        collectionName: CATALOG_COLLECTIONS.tags,
        key: { code: 1 },
        indexName: "tags_code_unique",
    },
    {
        collectionName: CATALOG_COLLECTIONS.badges,
        key: { code: 1 },
        indexName: "badges_code_unique",
    },
    {
        collectionName: CATALOG_COLLECTIONS.products,
        key: { productGroupCode: 1 },
        indexName: "products_product_group_code_unique",
    },
    {
        collectionName: CATALOG_COLLECTIONS.variants,
        key: { sku: 1 },
        indexName: "variants_sku_unique",
    },
    {
        collectionName: CATALOG_COLLECTIONS.productMediaMetadata,
        key: { storagePath: 1 },
        indexName: "product_media_storage_path_unique",
    },
];

const NON_UNIQUE_INDEX_DEFINITIONS = [
    {
        collectionName: CATALOG_COLLECTIONS.products,
        key: { isDeleted: 1, status: 1, categoryId: 1, brandId: 1 },
        indexName: "products_deleted_status_category_brand",
    },
    {
        collectionName: CATALOG_COLLECTIONS.products,
        key: { createdAt: -1 },
        indexName: "products_created_at_desc",
    },
    {
        collectionName: CATALOG_COLLECTIONS.products,
        key: { slug: 1 },
        indexName: "products_slug",
    },
    {
        collectionName: CATALOG_COLLECTIONS.products,
        key: { searchTitle: 1 },
        indexName: "products_search_title",
    },
    {
        collectionName: CATALOG_COLLECTIONS.products,
        key: { tagIds: 1 },
        indexName: "products_tag_ids",
    },
    {
        collectionName: CATALOG_COLLECTIONS.variants,
        key: { productId: 1, status: 1 },
        indexName: "variants_product_status",
    },
    {
        collectionName: CATALOG_COLLECTIONS.variants,
        key: {
            "variantAttributes.ram": 1,
            "variantAttributes.rom": 1,
        },
        indexName: "variants_ram_rom",
    },
    {
        collectionName: CATALOG_COLLECTIONS.variants,
        key: { "variantAttributes.color": 1 },
        indexName: "variants_color",
    },
    {
        collectionName: CATALOG_COLLECTIONS.variants,
        key: { salePrice: 1 },
        indexName: "variants_sale_price",
    },
    {
        collectionName: CATALOG_COLLECTIONS.productMediaMetadata,
        key: { variantId: 1, sortOrder: 1, createdAt: 1 },
        indexName: "product_media_variant_sort_created_at",
    },
];

export async function ensureCatalogIndexes({
    db,
    repository = createCatalogBaseRepository({ db }),
} = {}) {
    for (const definition of UNIQUE_INDEX_DEFINITIONS) {
        await repository.ensureUniqueIndex(definition);
    }

    for (const definition of NON_UNIQUE_INDEX_DEFINITIONS) {
        await repository.ensureIndex(definition);
    }
}

