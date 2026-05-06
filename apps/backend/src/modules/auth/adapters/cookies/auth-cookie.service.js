import {
    AUTH_ADMIN_ACCESS_TOKEN_COOKIE_NAME,
    AUTH_ACCESS_TOKEN_COOKIE_NAME,
    AUTH_CUSTOMER_ACCESS_TOKEN_COOKIE_NAME,
    AUTH_ACCESS_TOKEN_LIFETIME_MS,
} from "../../constants/index.js";

function resolveCookieTransportOptions() {
    if (process.env.NODE_ENV === "production") {
        return {
            sameSite: "none",
            secure: true,
        };
    }

    return {
        sameSite: "lax",
        secure: false,
    };
}

export function createAuthCookieService({
    maxAge = AUTH_ACCESS_TOKEN_LIFETIME_MS,
    sameSite = resolveCookieTransportOptions().sameSite,
    secure = resolveCookieTransportOptions().secure,
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

    function resolveCookieName(scope = "auto") {
        if (scope === "admin") {
            return AUTH_ADMIN_ACCESS_TOKEN_COOKIE_NAME;
        }

        if (scope === "customer") {
            return AUTH_CUSTOMER_ACCESS_TOKEN_COOKIE_NAME;
        }

        return AUTH_ACCESS_TOKEN_COOKIE_NAME;
    }

    function readCookieValue(req, cookieName) {
        const cookieValue = req?.cookies?.[cookieName];

        return typeof cookieValue === "string" && cookieValue.length > 0
            ? cookieValue
            : null;
    }

    function readCookieByScope(req, scope = "auto") {
        if (scope === "admin") {
            return (
                readCookieValue(req, AUTH_ADMIN_ACCESS_TOKEN_COOKIE_NAME) ??
                readCookieValue(req, AUTH_ACCESS_TOKEN_COOKIE_NAME)
            );
        }

        if (scope === "customer") {
            return (
                readCookieValue(req, AUTH_CUSTOMER_ACCESS_TOKEN_COOKIE_NAME) ??
                readCookieValue(req, AUTH_ACCESS_TOKEN_COOKIE_NAME)
            );
        }

        return (
            readCookieValue(req, AUTH_CUSTOMER_ACCESS_TOKEN_COOKIE_NAME) ??
            readCookieValue(req, AUTH_ADMIN_ACCESS_TOKEN_COOKIE_NAME) ??
            readCookieValue(req, AUTH_ACCESS_TOKEN_COOKIE_NAME)
        );
    }

    return {
        cookieName: AUTH_ACCESS_TOKEN_COOKIE_NAME,

        readAccessTokenFromRequest(req, { scope = "auto" } = {}) {
            return readCookieByScope(req, scope);
        },

        setAccessTokenCookie(res, accessToken, { scope = "auto" } = {}) {
            res.cookie(resolveCookieName(scope), accessToken, {
                ...createCookieOptions(),
                maxAge,
            });
        },

        clearAccessTokenCookie(res, { scope = "auto" } = {}) {
            if (scope === "all") {
                [
                    AUTH_CUSTOMER_ACCESS_TOKEN_COOKIE_NAME,
                    AUTH_ADMIN_ACCESS_TOKEN_COOKIE_NAME,
                    AUTH_ACCESS_TOKEN_COOKIE_NAME,
                ].forEach((cookieName) => {
                    res.clearCookie(cookieName, createCookieOptions());
                });

                return;
            }

            res.clearCookie(resolveCookieName(scope), createCookieOptions());
            res.clearCookie(
                AUTH_ACCESS_TOKEN_COOKIE_NAME,
                createCookieOptions()
            );
        },
    };
}
