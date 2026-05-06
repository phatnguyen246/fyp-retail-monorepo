import { resolveCartRequestOwner } from "../adapters/internal/index.js";
import { CART_GUEST_COOKIE_NAME } from "../constants/index.js";

export { resolveCartRequestOwner };

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

export function setCartGuestCookie(
    res,
    guestCookieValue,
    { cookieName = CART_GUEST_COOKIE_NAME } = {}
) {
    const cookieTransportOptions = resolveCookieTransportOptions();

    res.cookie(cookieName, guestCookieValue, {
        path: "/",
        httpOnly: true,
        sameSite: cookieTransportOptions.sameSite,
        secure: cookieTransportOptions.secure,
    });
}
