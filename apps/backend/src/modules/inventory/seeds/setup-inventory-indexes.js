import "dotenv/config";
import { connectMongo } from "../../../bootstrap/mongo.js";
import { ensureInventoryIndexes } from "../adapters/persistence/inventory-indexes.js";

export { ensureInventoryIndexes } from "../adapters/persistence/inventory-indexes.js";

export async function runInventoryIndexSetup({
    connectMongoFn = connectMongo,
    ensureInventoryIndexesFn = ensureInventoryIndexes,
    logger = console,
} = {}) {
    const { client, db } = await connectMongoFn();

    try {
        await ensureInventoryIndexesFn({ db });
        logger.log("Inventory indexes ensured successfully");
    } finally {
        await client.close();
    }
}

const isDirectExecution =
    typeof process.argv[1] === "string" &&
    import.meta.url === new URL(`file://${process.argv[1]}`).href;

if (isDirectExecution) {
    await runInventoryIndexSetup();
}
