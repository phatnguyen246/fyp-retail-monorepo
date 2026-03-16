import express from "express";

export function createOrderingAdminRouter({ controller } = {}) {
    const router = express.Router();

    router.get("/", controller.listOrders);
    router.get("/:orderId", controller.getOrderDetail);
    router.patch("/:orderId/status", controller.updateOrderStatus);
    router.post("/:orderId/cancel", controller.cancelOrder);

    return router;
}
