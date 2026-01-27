// apps/backend/src/bootstrap/app.js
import express from "express";
import { registerModules } from "./modules.js";
import { connectMongo } from "./mongo.js";

export async function createApp() {
    await connectMongo();

    const app = express();
    app.use(express.json());

    registerModules(app);

    // Error handler (global)
    // AppError: { code, statusCode }
    app.use((err, _req, res, _next) => {
        const status = err?.statusCode || 500;
        const code = err?.code || "INTERNAL_ERROR";
        const message = err?.message || "Internal Server Error";

        res.status(status).json({ code, message });
    });

    return app;
}
