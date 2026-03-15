import {
    createEmptyCartView,
    hasCartOwner,
    reconcileCartDocument,
} from "./cart-service.helpers.js";

export function createGetCartService({
    cartRepository,
    catalogAdapter,
    inventoryAdapter,
} = {}) {
    return async function getCart({ owner } = {}) {
        if (!hasCartOwner(owner)) {
            return createEmptyCartView();
        }

        const cart = await cartRepository.findCartByOwner({
            ownerType: owner.ownerType,
            ownerKey: owner.ownerKey,
        });

        if (!cart) {
            return createEmptyCartView();
        }

        const { cart: reconciledCart, changed, view } = await reconcileCartDocument({
            cart,
            catalogAdapter,
            inventoryAdapter,
        });

        if (changed) {
            await cartRepository.updateCartById({
                cartId: reconciledCart._id,
                cart: reconciledCart,
                updatedAt: new Date(),
            });
        }

        return view;
    };
}
