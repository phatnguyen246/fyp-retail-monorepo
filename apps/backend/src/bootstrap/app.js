// apps/backend/src/bootstrap/app.js
import express from "express";
import { createGlobalErrorHandler } from "./error-handler.js";
import { registerModules } from "./modules.js";
import { connectMongo } from "./mongo.js";
import { createFirebaseStorage } from "./storage.js";

export async function createApp({
    connectMongoFn = connectMongo,
    createStorageFn = createFirebaseStorage,
    storage,
} = {}) {
    const { client, db } = await connectMongoFn();
    const resolvedStorage =
        storage === undefined ? createStorageFn() : storage;

    const app = express();
    app.use(express.json());
    app.locals.mongoClient = client;
    app.locals.db = db;
    app.locals.storage = resolvedStorage ?? null;

    registerModules({ app, db, storage: resolvedStorage ?? undefined });

    app.use(createGlobalErrorHandler());

    return app;
}
