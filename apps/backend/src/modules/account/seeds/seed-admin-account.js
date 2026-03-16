import { pathToFileURL } from "node:url";
import bcrypt from "bcrypt";
import { connectMongo } from "../../../bootstrap/mongo.js";
import { createAccountAdapters } from "../adapters/index.js";
import { createAccountServices } from "../services/index.js";

export async function runSeedAdminAccount({
    connectMongoFn = connectMongo,
    bcryptLib = bcrypt,
    logger = console,
    email = process.env.ADMIN_EMAIL,
    password = process.env.ADMIN_PASSWORD,
    accountId = process.env.ADMIN_ACCOUNT_ID,
} = {}) {
    if (typeof email !== "string" || email.trim().length === 0) {
        throw new Error("Missing ADMIN_EMAIL environment variable");
    }

    if (typeof password !== "string" || password.length < 6) {
        throw new Error(
            "Missing ADMIN_PASSWORD environment variable or password is shorter than 6 characters"
        );
    }

    const { client, db } = await connectMongoFn();

    try {
        const adapters = createAccountAdapters({ db });
        const services = createAccountServices({ adapters });
        const passwordHash = await bcryptLib.hash(password, 10);
        const account = await services.seedAdminAccount({
            input: {
                accountId,
                email,
                passwordHash,
                role: "admin",
            },
        });

        logger.log(
            `Admin account ready for ${account.email} with accountId ${account.accountId}`
        );
    } finally {
        await client.close();
    }
}

if (process.argv[1]) {
    const isDirectExecution =
        import.meta.url === pathToFileURL(process.argv[1]).href;

    if (isDirectExecution) {
        await runSeedAdminAccount();
    }
}

