import express from "express";

export function createCatalogRouter({ controller }) {
    const router = express.Router();

    router.get("/health", controller.getHealth);

    return router;
}
