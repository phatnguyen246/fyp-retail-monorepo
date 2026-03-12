import { pathToFileURL } from "node:url";
import { connectMongo } from "../../../bootstrap/mongo.js";
import { createCatalogBaseRepository } from "../adapters/persistence/catalog-base.repository.js";
import { CATALOG_COLLECTIONS } from "../constants/index.js";

const INDEX_DEFINITIONS = [
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
];

export async function ensureCatalogIndexes({
    db,
    repository = createCatalogBaseRepository({ db }),
} = {}) {
    for (const definition of INDEX_DEFINITIONS) {
        await repository.ensureUniqueIndex(definition);
    }
}

export async function runCatalogIndexSetup({
    connectMongoFn = connectMongo,
    ensureCatalogIndexesFn = ensureCatalogIndexes,
    logger = console,
} = {}) {
    const { client, db } = await connectMongoFn();

    try {
        await ensureCatalogIndexesFn({ db });
        logger.log("Catalog indexes ensured successfully");
    } finally {
        await client.close();
    }
}

if (process.argv[1]) {
    const isDirectExecution =
        import.meta.url === pathToFileURL(process.argv[1]).href;

    if (isDirectExecution) {
        await runCatalogIndexSetup();
    }
}
