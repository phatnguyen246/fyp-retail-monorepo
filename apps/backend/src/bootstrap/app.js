// apps/backend/src/bootstrap/app.js
import express from "express";
import { registerModules } from "./modules.js";
import { connectMongo } from "./mongo.js";

export async function createApp() {
    await connectMongo();

    const app = express();
    app.use(express.json());

    registerModules(app);

    return app;
}
