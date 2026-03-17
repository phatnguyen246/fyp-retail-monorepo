import { createPayment, PAYMENT_DOCUMENT_SHAPE } from "./payment.model.js";

export { createPayment, PAYMENT_DOCUMENT_SHAPE } from "./payment.model.js";

export function createPaymentModels() {
    return {
        Payment: PAYMENT_DOCUMENT_SHAPE,
        createPayment,
    };
}
