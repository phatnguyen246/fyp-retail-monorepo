import { createCartValidation } from "../validation/index.js";
import { createCartItemNotFoundError } from "./cart-service.errors.js";
import {
    assertCartItemPurchasable,
    findCartItemIndex,
    hasCartOwner,
    readCartDependencies,
    reconcileCartDocument,
} from "./cart-service.helpers.js";

export function createUpdateCartItemService({
    cartRepository,
    catalogAdapter,
    inventoryAdapter,
    validation = createCartValidation(),
} = {}) {
    return async function updateCartItemQuantity({
        owner,
        variantId,
        input,
    } = {}) {
        const parsedParams = validation.parseCartItemParams({
            variantId,
        });
        const parsedInput = validation.parseUpdateCartItemInput(input ?? {});

        if (!hasCartOwner(owner)) {
            throw createCartItemNotFoundError(
                `Cart item not found for variant: ${parsedParams.variantId}`,
                {
                    variantId: parsedParams.variantId,
                }
            );
        }

        const cart = await cartRepository.findCartByOwner({
            ownerType: owner.ownerType,
            ownerKey: owner.ownerKey,
        });

        if (!cart) {
            throw createCartItemNotFoundError(
                `Cart item not found for variant: ${parsedParams.variantId}`,
                {
                    variantId: parsedParams.variantId,
                }
            );
        }

        const itemIndex = findCartItemIndex(cart, parsedParams.variantId);

        if (itemIndex === -1) {
            throw createCartItemNotFoundError(
                `Cart item not found for variant: ${parsedParams.variantId}`,
                {
                    variantId: parsedParams.variantId,
                }
            );
        }

        const { catalogByVariantId, inventoryByVariantId } =
            await readCartDependencies({
                catalogAdapter,
                inventoryAdapter,
                variantIds: [parsedParams.variantId],
            });

        assertCartItemPurchasable({
            catalogRead: catalogByVariantId.get(parsedParams.variantId),
            inventoryRead: inventoryByVariantId.get(parsedParams.variantId),
            quantity: parsedInput.quantity,
            variantId: parsedParams.variantId,
        });

        const nextItems = [...cart.items];
        nextItems[itemIndex] = {
            ...nextItems[itemIndex],
            quantity: parsedInput.quantity,
            selected: true,
        };

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
            item:
                view.items.find(
                    (item) => item.variantId === parsedParams.variantId
                ) ?? null,
            summary: view.summary,
        };
    };
}
