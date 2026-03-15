import { createCartValidation } from "../validation/index.js";
import {
    createEmptyCartView,
    findCartItemIndex,
    hasCartOwner,
    reconcileCartDocument,
} from "./cart-service.helpers.js";

export function createRemoveCartItemService({
    cartRepository,
    catalogAdapter,
    inventoryAdapter,
    validation = createCartValidation(),
} = {}) {
    return async function removeCartItem({ owner, variantId } = {}) {
        const parsedParams = validation.parseCartItemParams({
            variantId,
        });

        if (!hasCartOwner(owner)) {
            return {
                cartId: null,
                variantId: parsedParams.variantId,
                removed: false,
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
                variantId: parsedParams.variantId,
                removed: false,
                summary: createEmptyCartView().summary,
            };
        }

        const itemIndex = findCartItemIndex(cart, parsedParams.variantId);

        if (itemIndex === -1) {
            const { cart: reconciledCart, changed, view } =
                await reconcileCartDocument({
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

            return {
                cartId: view.id,
                variantId: parsedParams.variantId,
                removed: false,
                summary: view.summary,
            };
        }

        const nextItems = cart.items.filter((_item, index) => index !== itemIndex);
        const nextCart = {
            ...cart,
            items: nextItems,
            updatedAt: new Date(),
        };

        await cartRepository.updateCartById({
            cartId: cart._id,
            cart: nextCart,
            updatedAt: nextCart.updatedAt,
        });

        const { cart: reconciledCart, changed, view } = await reconcileCartDocument({
            cart: nextCart,
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

        return {
            cartId: view.id,
            variantId: parsedParams.variantId,
            removed: true,
            summary: view.summary,
        };
    };
}
