import { resolveCartRequestOwner } from "../adapters/internal/index.js";
import { CART_GUEST_COOKIE_NAME } from "../constants/index.js";

export { resolveCartRequestOwner };

export function setCartGuestCookie(
    res,
    guestCookieValue,
    { cookieName = CART_GUEST_COOKIE_NAME } = {}
) {
    res.cookie(cookieName, guestCookieValue, {
        path: "/",
        httpOnly: true,
        sameSite: "none",
        secure: true,
    });
}
