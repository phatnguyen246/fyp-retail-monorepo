import express from "express";

export function createInventoryAdminRouter({ controller }) {
    const router = express.Router();

    router.post("/records", controller.createInventoryRecord);
    router.get("/variants/:variantId", controller.getInventoryRecord);
    router.patch("/variants/:variantId", controller.updateInventoryRecord);
    router.post("/variants/read", controller.readInventoryRecords);
    router.get("/low-stock", controller.listLowStockInventory);

    return router;
}
