import rateLimit from "express-rate-limit";
import {
    AUTH_LOGIN_RATE_LIMIT_MAX_ATTEMPTS,
    AUTH_LOGIN_RATE_LIMIT_WINDOW_MS,
} from "../constants/index.js";

export function createAuthLoginRateLimiter({
    windowMs = AUTH_LOGIN_RATE_LIMIT_WINDOW_MS,
    max = AUTH_LOGIN_RATE_LIMIT_MAX_ATTEMPTS,
} = {}) {
    return rateLimit({
        windowMs,
        max,
        standardHeaders: true,
        legacyHeaders: false,
        handler(_req, res) {
            return res.status(429).json({
                code: "AUTH_RATE_LIMITED",
                message: "Too many login attempts, please try again later",
            });
        },
    });
}

