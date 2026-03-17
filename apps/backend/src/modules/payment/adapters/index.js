import { createPaymentInternalAdapters } from "./internal/index.js";
import { createPaymentPersistence } from "./persistence/index.js";

export function createPaymentAdapters({ db, env } = {}) {
    const persistence = createPaymentPersistence({ db });
    const internal = createPaymentInternalAdapters({ db, env });

    return {
        persistence,
        checkout: internal.checkout,
        order: internal.order,
        inventory: internal.inventory,
    };
}
