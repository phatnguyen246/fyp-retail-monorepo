import { pathToFileURL } from "node:url";
import { connectMongo } from "../../../bootstrap/mongo.js";
import { ensureCatalogIndexes } from "../adapters/persistence/catalog-indexes.js";

export { ensureCatalogIndexes } from "../adapters/persistence/catalog-indexes.js";

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
