import jwt from "jsonwebtoken";
import {
    AUTH_ACCESS_TOKEN_LIFETIME_SECONDS,
} from "../../constants/index.js";

export function createJwtService({
    jwtLib = jwt,
    secret = process.env.AUTH_JWT_SECRET ??
        process.env.JWT_SECRET ??
        "development-auth-secret",
    expiresIn = AUTH_ACCESS_TOKEN_LIFETIME_SECONDS,
} = {}) {
    if (typeof secret !== "string" || secret.trim().length === 0) {
        throw new Error("Auth JWT secret must be a non-empty string");
    }

    return {
        issueAccessToken({ accountId, role, email } = {}) {
            return jwtLib.sign(
                {
                    role,
                    ...(typeof email === "string" ? { email } : {}),
                },
                secret,
                {
                    subject: accountId,
                    expiresIn,
                }
            );
        },

        verifyAccessToken(token) {
            const payload = jwtLib.verify(token, secret);
            const accountId =
                typeof payload?.sub === "string" ? payload.sub : null;

            if (!accountId) {
                throw new Error("Auth access token subject is missing");
            }

            return {
                accountId,
                role: typeof payload?.role === "string" ? payload.role : null,
                email: typeof payload?.email === "string" ? payload.email : null,
            };
        },
    };
}

