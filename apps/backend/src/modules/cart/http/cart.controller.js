import { setCartGuestCookie } from "./cart-owner-cookie.js";
import { sendCartSuccess } from "./cart-response.js";

export function createCartController({ services }) {
    return {
        getHealth(_req, res) {
            return res.status(200).json(services.getHealth());
        },

        async getCart(req, res) {
            const cart = await services.getCart({
                owner: req.cartOwner ?? null,
            });

            return sendCartSuccess(res, {
                data: cart,
            });
        },

        async addCartItem(req, res) {
            const result = await services.addCartItem({
                owner: req.cartOwner,
                input: req.body,
            });

            if (req.cartOwnerContext?.shouldSetGuestCookie === true) {
                setCartGuestCookie(res, req.cartOwnerContext.guestCookieValue);
            }

            return sendCartSuccess(res, {
                data: result,
            });
        },

        async updateCartItem(req, res) {
            const result = await services.updateCartItem({
                owner: req.cartOwner ?? null,
                variantId: req.params.variantId,
                input: req.body,
            });

            return sendCartSuccess(res, {
                data: result,
            });
        },

        async removeCartItem(req, res) {
            const result = await services.removeCartItem({
                owner: req.cartOwner ?? null,
                variantId: req.params.variantId,
            });

            return sendCartSuccess(res, {
                data: result,
            });
        },

        async clearCart(req, res) {
            const result = await services.clearCart({
                owner: req.cartOwner ?? null,
            });

            return sendCartSuccess(res, {
                data: result,
            });
        },
    };
}
