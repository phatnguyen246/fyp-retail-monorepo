// apps/backend/src/bootstrap/app.js
import express from "express";
import { registerModules } from "./modules.js";

export async function createApp() {
    const app = express();
    app.use(express.json());

    registerModules(app);

    return app;
}
