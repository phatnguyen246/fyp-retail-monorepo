// apps/backend/src/bootstrap/app.js
import express from "express";
import { createGlobalErrorHandler } from "./error-handler.js";
import { registerModules } from "./modules.js";
import { connectMongo } from "./mongo.js";

export async function createApp({ connectMongoFn = connectMongo } = {}) {
    const { client, db } = await connectMongoFn();

    const app = express();
    app.use(express.json());
    app.locals.mongoClient = client;
    app.locals.db = db;

    registerModules({ app, db });

    app.use(createGlobalErrorHandler());

    return app;
}
