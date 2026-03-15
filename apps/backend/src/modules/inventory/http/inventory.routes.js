import express from "express";

export function createInventoryRouter({ controller }) {
    const router = express.Router();

    router.get("/health", controller.getHealth);
    router.get("/variants/:variantId", controller.getInventoryRecord);
    router.post("/variants/read", controller.readInventoryRecords);

    return router;
}
