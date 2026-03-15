import { createCartBaseRepository } from "./cart-base.repository.js";
import { ensureCartIndexes } from "./cart-indexes.js";
import { createCartRepository } from "./cart.repository.js";

export { createCartBaseRepository } from "./cart-base.repository.js";
export { ensureCartIndexes } from "./cart-indexes.js";
export { createCartRepository } from "./cart.repository.js";

export function createCartPersistence({ db } = {}) {
    const baseRepository = createCartBaseRepository({ db });

    return {
        baseRepository,
        cartRepository: createCartRepository({
            db,
            baseRepository,
        }),
    };
}
