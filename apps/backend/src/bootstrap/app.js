// apps/backend/src/bootstrap/app.js
import express from "express";
import { registerModules } from "./modules.js";
import { connectMongo } from "./mongo.js";

export async function createApp({ connectMongoFn = connectMongo } = {}) {
    const { client, db } = await connectMongoFn();

    const app = express();
    app.use(express.json());
    app.locals.mongoClient = client;
    app.locals.db = db;

    registerModules({ app, db });

    // Error handler (global)
    app.use((err, _req, res, _next) => {
        if (typeof err?.httpStatus === "number") {
            return res.status(err.httpStatus).json({
                code: err.code,
                message: err.message,
                meta: err.meta ?? undefined,
            });
        }

        const status = 500;
        const code = err?.code || "INTERNAL_ERROR";
        const message = "Internal Server Error";

        // log để debug
        console.error(err);

        return res.status(status).json({ code, message });
    });

    return app;
}
