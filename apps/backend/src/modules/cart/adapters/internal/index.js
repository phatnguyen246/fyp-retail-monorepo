import { createOrderCartReader } from "./order-cart.reader.js";

export { resolveCartRequestOwner } from "./cart-request-owner.js";
export { createOrderCartReader } from "./order-cart.reader.js";

export function createCartInternalAdapters({ cartRepository } = {}) {
    return {
        orderReader: createOrderCartReader({
            cartRepository,
        }),
    };
}
