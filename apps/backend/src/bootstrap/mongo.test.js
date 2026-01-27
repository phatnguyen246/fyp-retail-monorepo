import { describe, it, expect, vi } from "vitest";
import { connectMongo } from "./mongo.js";

function makeMongooseMock({ connectReject = null } = {}) {
    const handlers = new Map();

    return {
        connect: connectReject
            ? vi.fn().mockRejectedValue(connectReject)
            : vi.fn().mockResolvedValue(undefined),

        connection: {
            on: vi.fn((event, cb) => {
                handlers.set(event, cb);
            }),

            // helper để giả lập emit event
            __emit(event, ...args) {
                const cb = handlers.get(event);
                if (cb) cb(...args);
            },
        },
    };
}

describe("connectMongo (unit)", () => {
    it("throws when mongoUri is missing", async () => {
        await expect(connectMongo({ mongoUri: "" })).rejects.toThrow(
            "Missing MONGO_URI environment variable"
        );
    });

    it("registers event handlers and calls connect()", async () => {
        const mongooseMock = makeMongooseMock();
        const logger = { log: vi.fn(), error: vi.fn() };

        await connectMongo({
            mongooseClient: mongooseMock,
            mongoUri: "mongodb://localhost:27017/test",
            logger,
        });

        expect(mongooseMock.connection.on).toHaveBeenCalledTimes(3);
        expect(mongooseMock.connect).toHaveBeenCalledWith(
            "mongodb://localhost:27017/test"
        );

        // verify event handler behavior
        mongooseMock.connection.__emit("connected");
        expect(logger.log).toHaveBeenCalledWith("MongoDB connected");

        mongooseMock.connection.__emit("disconnected");
        expect(logger.log).toHaveBeenCalledWith("MongoDB disconnected");

        mongooseMock.connection.__emit("error", new Error("boom"));
        expect(logger.error).toHaveBeenCalledWith(
            "MongoDB connection error:",
            expect.any(Error)
        );
    });

    it("logs and rethrows when connect fails", async () => {
        const err = new Error("cannot connect");
        const mongooseMock = makeMongooseMock({ connectReject: err });
        const logger = { log: vi.fn(), error: vi.fn() };

        await expect(
            connectMongo({
                mongooseClient: mongooseMock,
                mongoUri: "mongodb://localhost:27017/test",
                logger,
            })
        ).rejects.toThrow("cannot connect");

        expect(logger.error).toHaveBeenCalledWith("MongoDB connect failed:", err);
    });
});
