import { describe, it, expect, vi } from "vitest";
import { connectMongo } from "./mongo.js";

function makeMongoClientMock({ connectReject = null, databaseName = "test" } = {}) {
    return {
        connect: connectReject
            ? vi.fn().mockRejectedValue(connectReject)
            : vi.fn().mockResolvedValue(undefined),
        db: vi.fn().mockReturnValue({ databaseName }),
        close: vi.fn().mockResolvedValue(undefined),
    };
}

function createMongoClientClass(client) {
    return vi.fn(function MockMongoClient() {
        return client;
    });
}

describe("connectMongo (unit)", () => {
    it("throws when mongoUri is missing", async () => {
        await expect(connectMongo({ mongoUri: "" })).rejects.toThrow(
            "Missing MONGODB_URI environment variable"
        );
    });

    it("connects and returns client and db", async () => {
        const client = makeMongoClientMock();
        const MongoClientClass = createMongoClientClass(client);
        const logger = { log: vi.fn(), error: vi.fn() };

        const result = await connectMongo({
            MongoClientClass,
            mongoUri: "mongodb://localhost:27017/test",
            logger,
        });

        expect(MongoClientClass).toHaveBeenCalledWith(
            "mongodb://localhost:27017/test"
        );
        expect(client.connect).toHaveBeenCalledTimes(1);
        expect(client.db).toHaveBeenCalledTimes(1);
        expect(result).toEqual({
            client,
            db: { databaseName: "test" },
        });
        expect(logger.log).toHaveBeenCalledWith(
            'MongoDB connected to database "test"'
        );
    });

    it("logs, closes the client, and rethrows when connect fails", async () => {
        const err = new Error("cannot connect");
        const client = makeMongoClientMock({ connectReject: err });
        const MongoClientClass = createMongoClientClass(client);
        const logger = { log: vi.fn(), error: vi.fn() };

        await expect(
            connectMongo({
                MongoClientClass,
                mongoUri: "mongodb://localhost:27017/test",
                logger,
            })
        ).rejects.toThrow("cannot connect");

        expect(logger.error).toHaveBeenCalledWith("MongoDB connect failed:", err);
        expect(client.close).toHaveBeenCalledTimes(1);
    });
});
