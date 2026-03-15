import { createCartValidation } from "../validation/index.js";
import {
    assertCartItemPurchasable,
    assertCartOwner,
    createCartDocument,
    createCartLine,
    findCartItemIndex,
    readCartDependencies,
    reconcileCartDocument,
} from "./cart-service.helpers.js";

export function createAddCartItemService({
    cartRepository,
    catalogAdapter,
    inventoryAdapter,
    validation = createCartValidation(),
} = {}) {
    return async function addCartItem({ owner, input } = {}) {
        const normalizedOwner = assertCartOwner(owner);
        const parsedInput = validation.parseAddCartItemInput(input ?? {});
        const existingCart = await cartRepository.findCartByOwner({
            ownerType: normalizedOwner.ownerType,
            ownerKey: normalizedOwner.ownerKey,
        });
        const itemIndex =
            existingCart !== null && existingCart !== undefined
                ? findCartItemIndex(existingCart, parsedInput.variantId)
                : -1;
        const existingItem =
            itemIndex >= 0 ? existingCart.items[itemIndex] : null;
        const targetQuantity = (existingItem?.quantity ?? 0) + parsedInput.quantity;
        const { catalogByVariantId, inventoryByVariantId } =
            await readCartDependencies({
                catalogAdapter,
                inventoryAdapter,
                variantIds: [parsedInput.variantId],
            });

        assertCartItemPurchasable({
            catalogRead: catalogByVariantId.get(parsedInput.variantId),
            inventoryRead: inventoryByVariantId.get(parsedInput.variantId),
            quantity: targetQuantity,
            variantId: parsedInput.variantId,
        });

        const timestamp = new Date();
        let nextCart;

        if (!existingCart) {
            nextCart = createCartDocument({
                owner: normalizedOwner,
                items: [
                    createCartLine({
                        variantId: parsedInput.variantId,
                        quantity: parsedInput.quantity,
                        selected: true,
                        addedAt: timestamp,
                    }),
                ],
                timestamp,
            });
            await cartRepository.createCart({
                document: nextCart,
            });
        } else {
            const nextItems = [...existingCart.items];

            if (itemIndex >= 0) {
                nextItems[itemIndex] = {
                    ...nextItems[itemIndex],
                    quantity: targetQuantity,
                    selected: true,
                };
            } else {
                nextItems.push(
                    createCartLine({
                        variantId: parsedInput.variantId,
                        quantity: parsedInput.quantity,
                        selected: true,
                        addedAt: timestamp,
                    })
                );
            }

            nextCart = {
                ...existingCart,
                items: nextItems,
                updatedAt: timestamp,
            };
            await cartRepository.updateCartById({
                cartId: existingCart._id,
                cart: nextCart,
                updatedAt: timestamp,
            });
        }

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
                view.items.find((item) => item.variantId === parsedInput.variantId) ??
                null,
            summary: view.summary,
        };
    };
}
