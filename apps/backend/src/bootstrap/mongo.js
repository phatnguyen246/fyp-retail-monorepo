// apps/backend/src/bootstrap/mongo.js
import mongoose from "mongoose";

export async function connectMongo({
    mongooseClient = mongoose,
    mongoUri = process.env.MONGO_URI,
    logger = console,
} = {}) {
    if (!mongoUri) {
        throw new Error("Missing MONGO_URI environment variable");
    }

    mongooseClient.connection.on("connected", () => {
        logger.log("MongoDB connected");
    });

    mongooseClient.connection.on("disconnected", () => {
        logger.log("MongoDB disconnected");
    });

    mongooseClient.connection.on("error", (err) => {
        logger.error("MongoDB connection error:", err);
    });

    try {
        await mongooseClient.connect(mongoUri);
    } catch (err) {
        logger.error("MongoDB connect failed:", err);
        throw err;
    }
}
