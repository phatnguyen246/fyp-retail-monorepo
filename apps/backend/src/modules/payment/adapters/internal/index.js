import { createPaymentCheckoutAdapter } from "./payment-checkout.adapter.js";
import { createPaymentInventoryAdapter } from "./payment-inventory.adapter.js";
import { createPaymentOrderAdapter } from "./payment-order.adapter.js";

export { createPaymentCheckoutAdapter } from "./payment-checkout.adapter.js";
export { createPaymentInventoryAdapter } from "./payment-inventory.adapter.js";
export { createPaymentOrderAdapter } from "./payment-order.adapter.js";

export function createPaymentInternalAdapters({ db, env } = {}) {
    return {
        checkout: createPaymentCheckoutAdapter({ db, env }),
        inventory: createPaymentInventoryAdapter({ db }),
        order: createPaymentOrderAdapter({ db }),
    };
}
