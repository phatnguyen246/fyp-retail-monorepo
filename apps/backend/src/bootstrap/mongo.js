import { MongoClient } from "mongodb";

export async function connectMongo({
    MongoClientClass = MongoClient,
    mongoUri = process.env.MONGODB_URI,
    logger = console,
} = {}) {
    if (!mongoUri) {
        throw new Error("Missing MONGODB_URI environment variable");
    }

    const client = new MongoClientClass(mongoUri);

    try {
        await client.connect();
        const db = client.db();

        logger.log(`MongoDB connected to database "${db.databaseName}"`);

        return { client, db };
    } catch (err) {
        logger.error("MongoDB connect failed:", err);
        await client.close().catch(() => undefined);
        throw err;
    }
}
