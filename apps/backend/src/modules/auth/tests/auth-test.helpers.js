import { createJwtService } from "../adapters/security/jwt.service.js";
import { AUTH_ACCESS_TOKEN_COOKIE_NAME } from "../constants/index.js";

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

    return `${AUTH_ACCESS_TOKEN_COOKIE_NAME}=${accessToken}`;
}
