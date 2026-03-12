import { pathToFileURL } from "node:url";
import { connectMongo } from "../../../bootstrap/mongo.js";
import { createCatalogBaseRepository } from "../adapters/persistence/catalog-base.repository.js";
import { CATALOG_COLLECTIONS } from "../constants/index.js";

const INDEX_DEFINITIONS = [
    {
        collectionName: CATALOG_COLLECTIONS.brands,
        indexName: "brands_code_unique",
    },
    {
        collectionName: CATALOG_COLLECTIONS.categories,
        indexName: "categories_code_unique",
    },
    {
        collectionName: CATALOG_COLLECTIONS.tags,
        indexName: "tags_code_unique",
    },
    {
        collectionName: CATALOG_COLLECTIONS.badges,
        indexName: "badges_code_unique",
    },
];

export async function ensureCatalogIndexes({
    db,
    repository = createCatalogBaseRepository({ db }),
} = {}) {
    for (const definition of INDEX_DEFINITIONS) {
        await repository.ensureCodeUniqueIndex(definition);
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
