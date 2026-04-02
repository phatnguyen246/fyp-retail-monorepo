import "dotenv/config";
import { connectMongo } from "../src/bootstrap/mongo.js";
import { createPaymentAdapters } from "../src/modules/payment/adapters/index.js";
import { createPaymentServices } from "../src/modules/payment/services/index.js";

function parseNumericArg(argv, name, fallbackValue) {
    const prefix = `--${name}=`;
    const matchedArgument = argv.find((argument) => argument.startsWith(prefix));

    if (!matchedArgument) {
        return fallbackValue;
    }

    const parsedValue = Number.parseInt(matchedArgument.slice(prefix.length), 10);

    return Number.isInteger(parsedValue) && parsedValue > 0
        ? parsedValue
        : fallbackValue;
}

function parseStringArg(argv, name, fallbackValue) {
    const prefix = `--${name}=`;
    const matchedArgument = argv.find((argument) => argument.startsWith(prefix));

    if (!matchedArgument) {
        return fallbackValue;
    }

    const value = matchedArgument.slice(prefix.length).trim();

    return value.length > 0 ? value : fallbackValue;
}

const cliArgs = process.argv.slice(2);
const options = {
    limit: parseNumericArg(cliArgs, "limit", 50),
    maxAgeHours: parseNumericArg(cliArgs, "max-age-hours", 48),
    minAgeMinutes: parseNumericArg(cliArgs, "min-age-minutes", 2),
    ipAddr: parseStringArg(
        cliArgs,
        "ip",
        process.env.VNP_QUERY_IP_ADDR ?? "127.0.0.1"
    ),
};

const { client, db } = await connectMongo();

try {
    const adapters = createPaymentAdapters({
        db,
        env: process.env,
    });
    const services = createPaymentServices({
        adapters,
        env: process.env,
        logger: console,
    });
    const result = await services.reconcilePendingVnpayPayments(options);

    console.log(JSON.stringify(result, null, 2));

    if (result?.counts?.error > 0) {
        process.exitCode = 1;
    }
} finally {
    await client.close().catch(() => undefined);
}
