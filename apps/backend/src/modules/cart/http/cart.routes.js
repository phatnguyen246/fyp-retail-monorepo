import express from "express";
import { resolveCartRequestOwner } from "./cart-owner-cookie.js";

export function createCartRouter({ controller }) {
    const router = express.Router();

    router.use((req, _res, next) => {
        req.cartOwner = resolveCartRequestOwner(req, {
            allowGuestIdentityCreation: false,
        }).owner;
        next();
    });

    router.get("/health", controller.getHealth);
    router.get("/", controller.getCart);
    router.post("/items", async (req, res, next) => {
        try {
            const ownerContext = resolveCartRequestOwner(req, {
                allowGuestIdentityCreation: true,
            });
            req.cartOwner = ownerContext.owner;
            req.cartOwnerContext = ownerContext;
            await controller.addCartItem(req, res);
        } catch (error) {
            next(error);
        }
    });
    router.patch("/items/:variantId", controller.updateCartItem);
    router.delete("/items/:variantId", controller.removeCartItem);
    router.delete("/", controller.clearCart);

    return router;
}
