// apps/backend/src/bootstrap/app.js
import compression from "compression";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { createGlobalErrorHandler } from "./error-handler.js";
import { registerModules } from "./modules.js";
import { connectMongo } from "./mongo.js";
import { createFirebaseStorage } from "./storage.js";

function normalizeOrigin(origin) {
    if (typeof origin !== "string") {
        return "";
    }
    return origin.trim().replace(/^['"]|['"]$/g, "").replace(/\/+$/, "");
}

function resolveAllowedOrigins(rawOrigins) {
    if (!rawOrigins) {
        return null;
    }
    const normalized = rawOrigins
        .split(",")
        .map((origin) => normalizeOrigin(origin))
        .filter(Boolean);
    return normalized.length ? normalized : null;
}

export async function createApp({
    connectMongoFn = connectMongo,
    createStorageFn = createFirebaseStorage,
    storage,
} = {}) {
    const { client, db } = await connectMongoFn();
    const resolvedStorage =
        storage === undefined ? createStorageFn() : storage;

    const app = express();
    const allowedOrigins = resolveAllowedOrigins(process.env.CORS_ALLOWED_ORIGINS);

    app.use(helmet());
    app.use(
        cors({
            origin: (requestOrigin, callback) => {
                if (!allowedOrigins) {
                    callback(null, true);
                    return;
                }
                const normalizedRequestOrigin = normalizeOrigin(requestOrigin);
                callback(null, allowedOrigins.includes(normalizedRequestOrigin));
            },
            credentials: true,
        })
    );
    app.use(compression());
    app.use(express.json());
    app.use(cookieParser());
    app.locals.mongoClient = client;
    app.locals.db = db;
    app.locals.storage = resolvedStorage ?? null;

    registerModules({ app, db, storage: resolvedStorage ?? undefined });

    app.use(createGlobalErrorHandler());

    return app;
}
