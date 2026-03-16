export function createMergeGuestCartToCustomerService({
    cartRepository,
} = {}) {
    return async function mergeGuestCartToCustomer({
        guestId,
        customerAccountId,
    } = {}) {
        if (
            typeof guestId !== "string" ||
            guestId.trim().length === 0 ||
            typeof customerAccountId !== "string" ||
            customerAccountId.trim().length === 0
        ) {
            return {
                merged: false,
            };
        }

        const guestCart = await cartRepository.findCartByOwner({
            ownerType: "guest",
            ownerKey: guestId.trim(),
        });

        if (!guestCart) {
            return {
                merged: false,
            };
        }

        await cartRepository.updateCartById({
            cartId: guestCart._id,
            cart: {
                ...guestCart,
                ownerType: "customer",
                ownerKey: customerAccountId.trim(),
            },
            updatedAt: new Date(),
        });

        return {
            merged: true,
            cartId: guestCart._id,
        };
    };
}

