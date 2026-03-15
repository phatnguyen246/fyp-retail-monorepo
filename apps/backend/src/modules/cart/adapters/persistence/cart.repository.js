import { CART_COLLECTIONS } from "../../constants/index.js";
import { createCartBaseRepository } from "./cart-base.repository.js";

export function createCartRepository({
    db,
    baseRepository = createCartBaseRepository({ db }),
} = {}) {
    return {
        findCartByOwner({ ownerType, ownerKey, projection } = {}) {
            return baseRepository.findOneByFilter({
                collectionName: CART_COLLECTIONS.carts,
                filter: {
                    ownerType,
                    ownerKey,
                },
                projection,
            });
        },

        createCart({ document, options } = {}) {
            return baseRepository.insertOne({
                collectionName: CART_COLLECTIONS.carts,
                document,
                options,
            });
        },

        updateCartById({ cartId, cart, updatedAt = new Date() } = {}) {
            return baseRepository.updateOneById({
                collectionName: CART_COLLECTIONS.carts,
                id: cartId,
                set: {
                    ownerType: cart.ownerType,
                    ownerKey: cart.ownerKey,
                    items: cart.items,
                    updatedAt,
                },
            });
        },
    };
}
