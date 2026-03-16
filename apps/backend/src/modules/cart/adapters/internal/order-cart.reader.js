import { hasCartOwner } from "../../services/cart-service.helpers.js";
import { toIdString } from "../../utils/index.js";

function normalizeVariantIds(variantIds = []) {
    return [...new Set((variantIds ?? []).map(toIdString).filter(Boolean))];
}

export function createOrderCartReader({ cartRepository } = {}) {
    return {
        async readCheckoutItems({ owner, variantIds } = {}) {
            const normalizedVariantIds = normalizeVariantIds(variantIds);

            if (normalizedVariantIds.length === 0) {
                return {
                    cartId: null,
                    items: [],
                    missingVariantIds: [],
                };
            }

            if (!hasCartOwner(owner)) {
                return {
                    cartId: null,
                    items: [],
                    missingVariantIds: normalizedVariantIds,
                };
            }

            const cart = await cartRepository.findCartByOwner({
                ownerType: owner.ownerType,
                ownerKey: owner.ownerKey,
            });

            if (!cart) {
                return {
                    cartId: null,
                    items: [],
                    missingVariantIds: normalizedVariantIds,
                };
            }

            const itemsByVariantId = new Map(
                (cart.items ?? [])
                    .map((item) => [toIdString(item?.variantId), item])
                    .filter(([variantId]) => typeof variantId === "string")
            );
            const checkoutItems = [];
            const missingVariantIds = [];

            for (const variantId of normalizedVariantIds) {
                const cartItem = itemsByVariantId.get(variantId);

                if (!cartItem) {
                    missingVariantIds.push(variantId);
                    continue;
                }

                checkoutItems.push({
                    variantId,
                    quantity: cartItem.quantity,
                    selected: cartItem.selected === true,
                    addedAt: cartItem.addedAt ?? null,
                });
            }

            return {
                cartId: toIdString(cart._id),
                items: checkoutItems,
                missingVariantIds,
            };
        },

        async removeCheckedOutItems({ owner, variantIds } = {}) {
            const normalizedVariantIds = normalizeVariantIds(variantIds);

            if (!hasCartOwner(owner) || normalizedVariantIds.length === 0) {
                return {
                    cartId: null,
                    removedVariantIds: [],
                    remainingItemCount: 0,
                };
            }

            const cart = await cartRepository.findCartByOwner({
                ownerType: owner.ownerType,
                ownerKey: owner.ownerKey,
            });

            if (!cart) {
                return {
                    cartId: null,
                    removedVariantIds: [],
                    remainingItemCount: 0,
                };
            }

            const variantIdSet = new Set(normalizedVariantIds);
            const removedVariantIds = (cart.items ?? [])
                .map((item) => toIdString(item?.variantId))
                .filter((variantId) => variantIdSet.has(variantId));

            if (removedVariantIds.length === 0) {
                return {
                    cartId: toIdString(cart._id),
                    removedVariantIds: [],
                    remainingItemCount: (cart.items ?? []).length,
                };
            }

            const nextItems = (cart.items ?? []).filter(
                (item) => !variantIdSet.has(toIdString(item?.variantId))
            );
            const updatedAt = new Date();

            await cartRepository.updateCartById({
                cartId: cart._id,
                cart: {
                    ...cart,
                    items: nextItems,
                    updatedAt,
                },
                updatedAt,
            });

            return {
                cartId: toIdString(cart._id),
                removedVariantIds,
                remainingItemCount: nextItems.length,
            };
        },
    };
}
