import { createPaymentBaseRepository } from "./payment-base.repository.js";
import { ensurePaymentIndexes } from "./payment-indexes.js";
import { createPaymentRepository } from "./payment.repository.js";

export { createPaymentBaseRepository } from "./payment-base.repository.js";
export { ensurePaymentIndexes } from "./payment-indexes.js";
export { createPaymentRepository } from "./payment.repository.js";

export function createPaymentPersistence({ db } = {}) {
    const baseRepository = createPaymentBaseRepository({ db });

    return {
        baseRepository,
        paymentRepository: createPaymentRepository({
            db,
            baseRepository,
        }),
    };
}
