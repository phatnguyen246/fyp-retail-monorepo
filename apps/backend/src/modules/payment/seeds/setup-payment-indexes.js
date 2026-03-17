import "dotenv/config";
import { connectMongo } from "../../../bootstrap/mongo.js";
import { ensurePaymentIndexes } from "../adapters/persistence/index.js";

export { ensurePaymentIndexes } from "../adapters/persistence/index.js";

export async function runPaymentIndexSetup({
    connectMongoFn = connectMongo,
    ensurePaymentIndexesFn = ensurePaymentIndexes,
    logger = console,
} = {}) {
    const { client, db } = await connectMongoFn();

    try {
        await ensurePaymentIndexesFn({ db });
        logger.log("Payment indexes ensured successfully");
    } finally {
        await client.close();
    }
}

const isDirectExecution =
    typeof process.argv[1] === "string" &&
    import.meta.url === new URL(`file://${process.argv[1]}`).href;

if (isDirectExecution) {
    await runPaymentIndexSetup();
}
