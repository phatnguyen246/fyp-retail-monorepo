import { createJwtService } from "../adapters/security/jwt.service.js";
import {
    AUTH_ADMIN_ACCESS_TOKEN_COOKIE_NAME,
    AUTH_CUSTOMER_ACCESS_TOKEN_COOKIE_NAME,
} from "../constants/index.js";

export function createAuthTestCookie({
    accountId = "acc_test_admin",
    role = "admin",
    email = "admin@example.com",
} = {}) {
    const jwtService = createJwtService();
    const accessToken = jwtService.issueAccessToken({
        accountId,
        role,
        email,
    });

    return `${
        role === "admin"
            ? AUTH_ADMIN_ACCESS_TOKEN_COOKIE_NAME
            : AUTH_CUSTOMER_ACCESS_TOKEN_COOKIE_NAME
    }=${accessToken}`;
}
