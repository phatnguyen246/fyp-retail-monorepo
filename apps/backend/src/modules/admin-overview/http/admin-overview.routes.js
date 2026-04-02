import express from "express";

export function createAdminOverviewRouter({ controller } = {}) {
    const router = express.Router();

    router.get("/", controller.getOverview);

    return router;
}
