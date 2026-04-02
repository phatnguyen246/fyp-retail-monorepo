import express from "express";
import { resolveCartRequestOwner } from "../../cart/adapters/internal/index.js";

export function createOrderingRouter({
    controller,
    requireAuthMiddleware,
} = {}) {
    const router = express.Router();

    router.use((req, _res, next) => {
        req.orderCartOwner = resolveCartRequestOwner(req, {
            allowGuestIdentityCreation: false,
        }).owner;
        next();
    });

    router.get("/health", controller.getHealth);
    router.post("/", controller.createOrder);
    router.post("/lookup", controller.lookupGuestOrder);
    router.get("/", requireAuthMiddleware, controller.listOrders);
    router.get("/:orderId", controller.getOrderDetail);
    router.post("/:orderId/cancel", requireAuthMiddleware, controller.cancelOrder);

    return router;
}
