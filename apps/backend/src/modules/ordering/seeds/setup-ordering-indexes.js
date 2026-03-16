import "dotenv/config";
import { connectMongo } from "../../../bootstrap/mongo.js";
import { ensureOrderingIndexes } from "../adapters/persistence/ordering-indexes.js";

export { ensureOrderingIndexes } from "../adapters/persistence/ordering-indexes.js";

export async function runOrderingIndexSetup({
    connectMongoFn = connectMongo,
    ensureOrderingIndexesFn = ensureOrderingIndexes,
    logger = console,
} = {}) {
    const { client, db } = await connectMongoFn();

    try {
        await ensureOrderingIndexesFn({ db });
        logger.log("Ordering indexes ensured successfully");
    } finally {
        await client.close();
    }
}

const isDirectExecution =
    typeof process.argv[1] === "string" &&
    import.meta.url === new URL(`file://${process.argv[1]}`).href;

if (isDirectExecution) {
    await runOrderingIndexSetup();
}
