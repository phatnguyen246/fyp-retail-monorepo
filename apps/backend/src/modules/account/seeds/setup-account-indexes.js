import { pathToFileURL } from "node:url";
import { connectMongo } from "../../../bootstrap/mongo.js";
import { ensureAccountIndexes } from "../adapters/persistence/account-indexes.js";

export { ensureAccountIndexes } from "../adapters/persistence/account-indexes.js";

export async function runAccountIndexSetup({
    connectMongoFn = connectMongo,
    ensureAccountIndexesFn = ensureAccountIndexes,
    logger = console,
} = {}) {
    const { client, db } = await connectMongoFn();

    try {
        await ensureAccountIndexesFn({ db });
        logger.log("Account indexes ensured successfully");
    } finally {
        await client.close();
    }
}

if (process.argv[1]) {
    const isDirectExecution =
        import.meta.url === pathToFileURL(process.argv[1]).href;

    if (isDirectExecution) {
        await runAccountIndexSetup();
    }
}

