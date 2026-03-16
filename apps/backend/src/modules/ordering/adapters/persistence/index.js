import { createOrderingBaseRepository } from "./ordering-base.repository.js";
import { ensureOrderingIndexes } from "./ordering-indexes.js";
import { createOrderRepository } from "./order.repository.js";

export { createOrderingBaseRepository } from "./ordering-base.repository.js";
export { ensureOrderingIndexes } from "./ordering-indexes.js";
export { createOrderRepository } from "./order.repository.js";

export function createOrderingPersistence({ db } = {}) {
    const baseRepository = createOrderingBaseRepository({ db });

    return {
        baseRepository,
        orderRepository: createOrderRepository({
            db,
            baseRepository,
        }),
    };
}
