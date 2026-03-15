import {
    createEmptyCartView,
    hasCartOwner,
} from "./cart-service.helpers.js";

export function createClearCartService({ cartRepository } = {}) {
    return async function clearCart({ owner } = {}) {
        if (!hasCartOwner(owner)) {
            return {
                cartId: null,
                cleared: true,
                summary: createEmptyCartView().summary,
            };
        }

        const cart = await cartRepository.findCartByOwner({
            ownerType: owner.ownerType,
            ownerKey: owner.ownerKey,
        });

        if (!cart) {
            return {
                cartId: null,
                cleared: true,
                summary: createEmptyCartView().summary,
            };
        }

        const nextCart = {
            ...cart,
            items: [],
            updatedAt: new Date(),
        };

        await cartRepository.updateCartById({
            cartId: cart._id,
            cart: nextCart,
            updatedAt: nextCart.updatedAt,
        });

        return {
            cartId: cart._id.toHexString(),
            cleared: true,
            summary: createEmptyCartView().summary,
        };
    };
}
