import { randomUUID } from "node:crypto";
import { CART_GUEST_COOKIE_NAME } from "../constants/index.js";

export function resolveCartRequestOwner(
    req,
    { allowGuestIdentityCreation = false, createGuestId = randomUUID } = {}
) {
    if (typeof req?.user?.id === "string" && req.user.id.trim().length > 0) {
        return {
            owner: {
                ownerType: "customer",
                ownerKey: req.user.id.trim(),
            },
            shouldSetGuestCookie: false,
            guestCookieValue: null,
        };
    }

    const guestCookieValue =
        typeof req?.cookies?.[CART_GUEST_COOKIE_NAME] === "string"
            ? req.cookies[CART_GUEST_COOKIE_NAME]
            : null;

    if (typeof guestCookieValue === "string" && guestCookieValue.length > 0) {
        return {
            owner: {
                ownerType: "guest",
                ownerKey: guestCookieValue,
            },
            shouldSetGuestCookie: false,
            guestCookieValue,
        };
    }

    if (!allowGuestIdentityCreation) {
        return {
            owner: null,
            shouldSetGuestCookie: false,
            guestCookieValue: null,
        };
    }

    const generatedGuestId = createGuestId();

    return {
        owner: {
            ownerType: "guest",
            ownerKey: generatedGuestId,
        },
        shouldSetGuestCookie: true,
        guestCookieValue: generatedGuestId,
    };
}

export function setCartGuestCookie(
    res,
    guestCookieValue,
    { cookieName = CART_GUEST_COOKIE_NAME } = {}
) {
    res.cookie(cookieName, guestCookieValue, {
        path: "/",
        httpOnly: true,
        sameSite: "lax",
    });
}
