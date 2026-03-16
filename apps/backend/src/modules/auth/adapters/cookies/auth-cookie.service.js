import {
    AUTH_ACCESS_TOKEN_COOKIE_NAME,
    AUTH_ACCESS_TOKEN_LIFETIME_MS,
} from "../../constants/index.js";

export function createAuthCookieService({
    cookieName = AUTH_ACCESS_TOKEN_COOKIE_NAME,
    maxAge = AUTH_ACCESS_TOKEN_LIFETIME_MS,
    sameSite = "lax",
    secure = process.env.NODE_ENV === "production",
    path = "/",
} = {}) {
    function createCookieOptions() {
        return {
            httpOnly: true,
            sameSite,
            secure,
            path,
        };
    }

    return {
        cookieName,

        readAccessTokenFromRequest(req) {
            const cookieValue = req?.cookies?.[cookieName];

            return typeof cookieValue === "string" && cookieValue.length > 0
                ? cookieValue
                : null;
        },

        setAccessTokenCookie(res, accessToken) {
            res.cookie(cookieName, accessToken, {
                ...createCookieOptions(),
                maxAge,
            });
        },

        clearAccessTokenCookie(res) {
            res.clearCookie(cookieName, createCookieOptions());
        },
    };
}

