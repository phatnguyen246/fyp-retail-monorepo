import express from "express";
import { createAuthLoginRateLimiter } from "./auth.rate-limit.js";

export function createAuthRouter({
    controller,
    middlewares,
    loginRateLimiter = createAuthLoginRateLimiter(),
} = {}) {
    const router = express.Router();

    router.get("/health", controller.getHealth);
    router.post("/register", controller.register);
    router.post("/login", loginRateLimiter, controller.login);
    router.post("/logout", controller.logout);
    router.get("/me", middlewares.requireAuth, controller.getCurrentUser);

    return router;
}

